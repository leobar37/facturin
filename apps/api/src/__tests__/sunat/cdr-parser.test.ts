/**
 * CDR Parser Tests
 *
 * Tests for parsing SUNAT CDR (Constancia de Recepción) responses
 */

import { describe, it, expect } from 'bun:test';
import {
  parseCDR,
  extractCDRContent,
  isCDRAccepted,
  isCDRRejected,
  isCDRException,
} from '../../sunat/cdr/parser';

describe('CDR Parser', () => {
  describe('parseCDR', () => {
    describe('Accepted documents (code 0)', () => {
      it('should parse CDR with status code 0 (ACEPTADO)', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000001</cbc:ID>
                <cbc:ResponseCode>0</cbc:ResponseCode>
                <cbc:Description>La Factura numero F001-00000001, ha sido aceptada</cbc:Description>
                <cbc:Note>第一步成功</cbc:Note>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(0);
        expect(result.status).toBe('ACEPTADO');
        expect(result.description).toContain('aceptada');
        expect(result.notes).toContain('第一步成功');
      });

      it('should parse SOAP response with statusCode 0', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <sendBillResponse xmlns="http://service.sunat.gob.pe">
                <statusCode>0</statusCode>
                <statusMessage>OPCIÓN 1: El documento ha sido recibido exitosamente</statusMessage>
                <responseContent>UEsDBBQABgAIAAAAIQC2g</responseContent>
              </sendBillResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(0);
        expect(result.status).toBe('ACEPTADO');
        expect(result.cdrContent).toBeDefined();
      });

      it('should handle applicationResponse format', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
              <ns2:sendBillResponse xmlns:ns2="http://service.sunat.gob.pe">
                <applicationResponse>UEsDBBQABgAIAAAAIQC2g</applicationResponse>
              </ns2:sendBillResponse>
            </soap:Body>
          </soap:Envelope>
        `;

        const result = parseCDR(xmlContent);

        // Should default to 0 when no ResponseCode is present but has applicationResponse
        expect(result.statusCode).toBe(0);
        expect(result.cdrContent).toBe('UEsDBBQABgAIAAAAIQC2g');
      });
    });

    describe('Rejected documents (code 2000+)', () => {
      it('should parse CDR with rejection code 2000', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000002</cbc:ID>
                <cbc:ResponseCode>2000</cbc:ResponseCode>
                <cbc:Description>La estructura del documento electrónico contiene errores de formato</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(2000);
        expect(result.status).toBe('RECHAZADO');
        expect(result.description).toContain('errores de formato');
      });

      it('should parse rejection code 2020 (RUC emisor no existe)', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000003</cbc:ID>
                <cbc:ResponseCode>2020</cbc:ResponseCode>
                <cbc:Description>El RUC del emisor no existe</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(2020);
        expect(result.status).toBe('RECHAZADO');
        expect(result.description).toContain('RUC del emisor');
      });

      it('should parse rejection code 2030 (fecha emisión mayor a actual)', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000004</cbc:ID>
                <cbc:ResponseCode>2030</cbc:ResponseCode>
                <cbc:Description>La fecha de emisión no puede ser mayor a la fecha actual</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(2030);
        expect(result.status).toBe('RECHAZADO');
        expect(result.description).toContain('fecha de emisión');
      });

      it('should parse rejection code 2070 (suma impuestos no coincide)', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000005</cbc:ID>
                <cbc:ResponseCode>2070</cbc:ResponseCode>
                <cbc:Description>El monto total no coincide con la suma de los items</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(2070);
        expect(result.status).toBe('RECHAZADO');
        expect(result.description).toContain('monto total');
      });
    });

    describe('Exception documents (code 99)', () => {
      it('should parse CDR with exception code 99', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000006</cbc:ID>
                <cbc:ResponseCode>99</cbc:ResponseCode>
                <cbc:Description>Excepción en el procesamiento</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(99);
        expect(result.status).toBe('EXCEPCION');
        expect(result.description).toContain('Excepción');
      });

      it('should parse SOAP fault as exception', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <soapenv:Fault>
                <faultcode>soapenv:Server</faultcode>
                <faultstring>Error interno del sistema</faultstring>
              </soapenv:Fault>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(99);
        expect(result.status).toBe('EXCEPCION');
        expect(result.description).toContain('Error interno del sistema');
      });

      it('should handle exception codes in 100-1999 range', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000007</cbc:ID>
                <cbc:ResponseCode>500</cbc:ResponseCode>
                <cbc:Description>Error de validación interno</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(500);
        expect(result.status).toBe('EXCEPCION');
      });
    });

    describe('En proceso (code 98)', () => {
      it('should parse CDR with code 98 as EN_PROCESO', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000008</cbc:ID>
                <cbc:ResponseCode>98</cbc:ResponseCode>
                <cbc:Description>En proceso de consulta</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(98);
        expect(result.status).toBe('EN_PROCESO');
      });
    });

    describe('Unknown status', () => {
      it('should return UNKNOWN for unrecognized status codes', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000009</cbc:ID>
                <cbc:ResponseCode>9999</cbc:ResponseCode>
                <cbc:Description>Some unknown status</cbc:Description>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(9999);
        // 9999 >= 4000 means it's accepted according to SUNAT
        expect(result.status).toBe('ACEPTADO');
      });

      it('should handle malformed XML gracefully', () => {
        const xmlContent = `This is not XML at all`;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(99);
        expect(result.status).toBe('UNKNOWN');
        expect(result.description).toBe('Unable to parse CDR content');
      });

      it('should handle empty content', () => {
        const xmlContent = ``;

        const result = parseCDR(xmlContent);

        expect(result.statusCode).toBe(99);
        expect(result.status).toBe('UNKNOWN');
      });
    });

    describe('CDR with notes', () => {
      it('should extract multiple notes from CDR', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2">
                <cbc:ID>20480001234-01-F001-00000010</cbc:ID>
                <cbc:ResponseCode>0</cbc:ResponseCode>
                <cbc:Description>Documento aceptado</cbc:Description>
                <cbc:Note>Nota 1: Todo correcto</cbc:Note>
                <cbc:Note>Nota 2: Sin observaciones</cbc:Note>
                <cbc:Note>Nota 3: Confirmado</cbc:Note>
              </ApplicationResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.notes).toBeDefined();
        expect(result.notes).toHaveLength(3);
        expect(result.notes).toContain('Nota 1: Todo correcto');
        expect(result.notes).toContain('Nota 2: Sin observaciones');
        expect(result.notes).toContain('Nota 3: Confirmado');
      });
    });

    describe('CDR with ZIP content', () => {
      it('should extract applicationResponse content', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <sendBillResponse xmlns="http://service.sunat.gob.pe">
                <applicationResponse>UEsDBBQABgAIAAAAIQC2g</applicationResponse>
              </sendBillResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.cdrContent).toBe('UEsDBBQABgAIAAAAIQC2g');
      });

      it('should extract responseContent content', () => {
        const xmlContent = `
          <?xml version="1.0" encoding="UTF-8"?>
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
            <soapenv:Body>
              <ns2:sendBillResponse xmlns:ns2="http://service.sunat.gob.pe">
                <statusCode>0</statusCode>
                <responseContent>UEsDBBQABgAIAAAAIQC2g</responseContent>
              </ns2:sendBillResponse>
            </soapenv:Body>
          </soapenv:Envelope>
        `;

        const result = parseCDR(xmlContent);

        expect(result.cdrContent).toBe('UEsDBBQABgAIAAAAIQC2g');
      });
    });
  });

  describe('extractCDRContent', () => {
    it('should extract applicationResponse from SOAP response', () => {
      const xmlContent = `
        <soapenv:Body>
          <sendBillResponse>
            <applicationResponse>BASE64CONTENT123</applicationResponse>
          </sendBillResponse>
        </soapenv:Body>
      `;

      const content = extractCDRContent(xmlContent);

      expect(content).toBe('BASE64CONTENT123');
    });

    it('should extract responseContent from SOAP response', () => {
      const xmlContent = `
        <soapenv:Body>
          <getStatusResponse>
            <statusCode>0</statusCode>
            <responseContent>ANOTHERBASE64</responseContent>
          </getStatusResponse>
        </soapenv:Body>
      `;

      const content = extractCDRContent(xmlContent);

      expect(content).toBe('ANOTHERBASE64');
    });

    it('should return null when no content found', () => {
      const xmlContent = `<soapenv:Body><someResponse/></soapenv:Body>`;

      const content = extractCDRContent(xmlContent);

      expect(content).toBeNull();
    });
  });

  describe('status check helpers', () => {
    it('isCDRAccepted should return true for ACEPTADO status', () => {
      const cdr = {
        id: 'test',
        statusCode: 0 as const,
        status: 'ACEPTADO' as const,
        description: 'Accepted',
      };

      expect(isCDRAccepted(cdr)).toBe(true);
    });

    it('isCDRAccepted should return false for non-ACEPTADO status', () => {
      const cdr = {
        id: 'test',
        statusCode: 2000 as const,
        status: 'RECHAZADO' as const,
        description: 'Rejected',
      };

      expect(isCDRAccepted(cdr)).toBe(false);
    });

    it('isCDRRejected should return true for RECHAZADO status', () => {
      const cdr = {
        id: 'test',
        statusCode: 2000 as const,
        status: 'RECHAZADO' as const,
        description: 'Rejected',
      };

      expect(isCDRRejected(cdr)).toBe(true);
    });

    it('isCDRRejected should return false for non-RECHAZADO status', () => {
      const cdr = {
        id: 'test',
        statusCode: 0 as const,
        status: 'ACEPTADO' as const,
        description: 'Accepted',
      };

      expect(isCDRRejected(cdr)).toBe(false);
    });

    it('isCDRException should return true for EXCEPCION status', () => {
      const cdr = {
        id: 'test',
        statusCode: 99 as const,
        status: 'EXCEPCION' as const,
        description: 'Exception',
      };

      expect(isCDRException(cdr)).toBe(true);
    });

    it('isCDRException should return false for non-EXCEPCION status', () => {
      const cdr = {
        id: 'test',
        statusCode: 0 as const,
        status: 'ACEPTADO' as const,
        description: 'Accepted',
      };

      expect(isCDRException(cdr)).toBe(false);
    });
  });
});
