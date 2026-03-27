/**
 * BullMQ Processor: Enviar Comprobante
 *
 * Processes a comprobante job to send it to SUNAT:
 * 1. Get comprobante and tenant from DB
 * 2. Generate UBL XML using sunat/xml/generator
 * 3. Sign XML using sunat/xml/signer
 * 4. Send to SUNAT using sunat/client
 * 5. Store ticket and XML content in DB
 * 6. If async (ticket), schedule consultar-cdr job
 * 7. If sync (accepted/rejected), update status immediately
 */

import { generateXML } from '../../sunat/xml';
import { signXML } from '../../sunat/xml';
import { SunatClient } from '../../sunat/client';
import type {
  SunatEnvironment,
  ComprobanteSunatEstado,
  XmlGenerationInput,
  XmlSignerInput,
  XmlFormaPago,
} from '../../sunat/types';
import { comprobantesRepository } from '../../repositories/comprobantes.repository';
import { tenantsRepository } from '../../repositories/tenants.repository';
import { enqueueConsultarCdr } from '../queue';
import type { EnviarComprobanteJobData } from '../queue';

export interface EnviarComprobanteResult {
  success: boolean;
  comprobanteId: string;
  estado: ComprobanteSunatEstado;
  ticket?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Process a comprobante sending job
 */
export async function processEnviarComprobante(
  data: EnviarComprobanteJobData
): Promise<EnviarComprobanteResult> {
  const { comprobanteId, tenantId } = data;

  console.log(`[enviar-comprobante] Starting process for comprobante ${comprobanteId}`);

  // Step 1: Get comprobante and tenant from DB
  const comprobante = await comprobantesRepository.findByTenantAndId(tenantId, comprobanteId);

  if (!comprobante) {
    console.error(`[enviar-comprobante] Comprobante ${comprobanteId} not found`);
    return {
      success: false,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'NOT_FOUND',
      errorMessage: `Comprobante ${comprobanteId} not found`,
    };
  }

  const tenant = await tenantsRepository.findById(tenantId);

  if (!tenant) {
    console.error(`[enviar-comprobante] Tenant ${tenantId} not found`);
    return {
      success: false,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'TENANT_NOT_FOUND',
      errorMessage: `Tenant ${tenantId} not found`,
    };
  }

  if (!tenant.certificadoDigital || !tenant.certificadoPassword) {
    console.error(`[enviar-comprobante] Tenant ${tenantId} missing certificate`);
    return {
      success: false,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'MISSING_CERTIFICATE',
      errorMessage: 'Tenant certificate not configured',
    };
  }

  if (!tenant.sunatUsername || !tenant.sunatPassword) {
    console.error(`[enviar-comprobante] Tenant ${tenantId} missing SUNAT credentials`);
    return {
      success: false,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'MISSING_CREDENTIALS',
      errorMessage: 'Tenant SUNAT credentials not configured',
    };
  }

  try {
    // Step 2: Generate UBL XML
    console.log(`[enviar-comprobante] Generating XML for comprobante ${comprobanteId}`);

    const xmlInput: XmlGenerationInput = {
      tipoComprobante: comprobante.tipoComprobante as XmlGenerationInput['tipoComprobante'],
      serie: comprobante.serie,
      numero: comprobante.numero,
      fechaEmision: comprobante.fechaEmision.toISOString(),
      tenant: {
        ruc: tenant.ruc,
        razonSocial: tenant.razonSocial,
        nombreComercial: tenant.nombreComercial || undefined,
        direccion: tenant.direccion?.direccion,
        ubigeo: tenant.direccion?.ubigeo,
      },
      cliente: {
        tipoDocumento: comprobante.clienteTipoDocumento,
        numeroDocumento: comprobante.clienteNumeroDocumento,
        nombre: comprobante.clienteNombre,
        direccion: typeof comprobante.clienteDireccion === 'string'
          ? comprobante.clienteDireccion
          : (comprobante.clienteDireccion as { direccion?: string })?.direccion,
      },
      detalles: (comprobante.detalles || []) as unknown as XmlGenerationInput['detalles'],
      totales: {
        totalGravadas: parseFloat(comprobante.totalGravadas) || 0,
        totalExoneradas: 0,
        totalInafectas: 0,
        totalGratuitas: 0,
        totalIgv: parseFloat(comprobante.totalIgv) || 0,
        totalIsc: 0,
        totalIcbp: 0,
        totalOtrosCargos: 0,
        totalImporte: parseFloat(comprobante.totalImporte) || 0,
      },
      formaPago: comprobante.formaPago as unknown as XmlFormaPago | undefined,
      leyendas: (comprobante.leyendas || []) as unknown as XmlGenerationInput['leyendas'],
    };

    const xmlContent = generateXML(xmlInput);

    // Step 3: Sign XML
    console.log(`[enviar-comprobante] Signing XML for comprobante ${comprobanteId}`);

    const signerInput: XmlSignerInput = {
      xmlContent,
      certificateBase64: tenant.certificadoDigital,
      certificatePassword: tenant.certificadoPassword,
      signeriId: tenant.ruc,
    };

    const signedResult = await signXML(signerInput);
    const signedXml = signedResult.signedXml;

    // Store XML content in DB
    await comprobantesRepository.updateXmlContent(comprobanteId, signedXml);

    // Step 4: Send to SUNAT
    console.log(`[enviar-comprobante] Sending to SUNAT for comprobante ${comprobanteId}`);

    // Determine environment based on tenant or default to beta
    const environment: SunatEnvironment = process.env.SUNAT_ENVIRONMENT as SunatEnvironment || 'beta';

    const sunatClient = await SunatClient.create(
      {
        username: tenant.sunatUsername,
        password: tenant.sunatPassword,
      },
      environment
    );

    // Build filename: RUC-TipoComprobante-Serie-Numero.zip
    const fileName = `${tenant.ruc}-${comprobante.tipoComprobante}-${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}.xml`;

    const sendResult = await sunatClient.sendBill(fileName, signedXml);

    if (!sendResult.success) {
      console.error(`[enviar-comprobante] SUNAT send failed for comprobante ${comprobanteId}:`, sendResult.errorMessage);

      // Update status to rejected
      await comprobantesRepository.updateSunatEstado(comprobanteId, 'rechazado');

      return {
        success: false,
        comprobanteId,
        estado: 'rechazado',
        errorCode: sendResult.errorCode,
        errorMessage: sendResult.errorMessage,
      };
    }

    // Step 5: Store ticket and XML content
    if (sendResult.ticket) {
      // Async mode - SUNAT returns a ticket
      console.log(`[enviar-comprobante] SUNAT ticket received for comprobante ${comprobanteId}: ${sendResult.ticket}`);

      await comprobantesRepository.updateSunatTicket(comprobanteId, sendResult.ticket);

      // Step 6: Schedule consultar-cdr job
      // Start consulting after 5 seconds (SUNAT needs time to process)
      await enqueueConsultarCdr(sendResult.ticket, tenantId, comprobanteId, 5000);

      return {
        success: true,
        comprobanteId,
        estado: 'enviado',
        ticket: sendResult.ticket,
      };
    }

    // Step 7: Sync mode - Direct response with status
    console.log(`[enviar-comprobante] SUNAT sync response for comprobante ${comprobanteId}: code=${sendResult.statusCode}`);

    if (sendResult.statusCode === 0) {
      // Accepted
      await comprobantesRepository.updateSunatEstado(comprobanteId, 'aceptado');

      if (sendResult.xmlContent) {
        await comprobantesRepository.updateCdr(
          comprobanteId,
          'aceptado',
          sendResult.xmlContent,
          'ACEPTADO'
        );
      }

      return {
        success: true,
        comprobanteId,
        estado: 'aceptado',
      };
    } else {
      // Rejected (non-zero status code that's not an error)
      await comprobantesRepository.updateSunatEstado(comprobanteId, 'rechazado');

      return {
        success: false,
        comprobanteId,
        estado: 'rechazado',
        errorCode: String(sendResult.statusCode),
        errorMessage: sendResult.errorMessage || 'SUNAT rejected the document',
      };
    }
  } catch (error) {
    console.error(`[enviar-comprobante] Error processing comprobante ${comprobanteId}:`, error);

    // Update status to rejected on error
    await comprobantesRepository.updateSunatEstado(comprobanteId, 'rechazado');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'PROCESS_ERROR',
      errorMessage,
    };
  }
}
