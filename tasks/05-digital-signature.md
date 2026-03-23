# Task 5: Digital Signature (XML Signature)

## Objetivo
Implementar firma digital XML según estándar XAdES-EPES de SUNAT.

## Entregables
- [ ] Servicio de firma XML usando certificados .pfx/.p12
- [ ] Extracción de clave privada y certificado X.509
- [ ] Firma con RSA-SHA256
- [ ] Canonicalización Exclusive C14N
- [ ] Inserción de firma en UBLExtensions

## Especificaciones Técnicas SUNAT

### Algoritmos
- **Canonicalization:** http://www.w3.org/2001/10/xml-exc-c14n#
- **Signature Method:** http://www.w3.org/2001/04/xmldsig-more#rsa-sha256
- **Transform:** http://www.w3.org/2000/09/xmldsig#enveloped-signature
- **Digest Method:** http://www.w3.org/2001/04/xmlenc#sha256

### Librerías a Usar
```bash
npm install xml-crypto node-forge
# o alternativas más modernas si existen para Bun
```

## Implementación

```typescript
// apps/api/src/services/infrastructure/xml-signer.ts

import { SignedXml } from 'xml-crypto';
import * as forge from 'node-forge';

export class XmlSignerService {
  async firmarXML(
    xml: string,
    certificadoPfxBase64: string,
    password: string
  ): Promise<string> {
    // 1. Decodificar PFX
    const pfxBuffer = Buffer.from(certificadoPfxBase64, 'base64');
    
    // 2. Extraer clave privada y certificado
    const { privateKeyPem, certificatePem } = this.extractFromPFX(
      pfxBuffer,
      password
    );
    
    // 3. Crear firma
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    });
    
    // 4. Agregar referencia
    sig.addReference({
      xpath: "//*[local-name(.)='Invoice' or local-name(.)='CreditNote' or local-name(.)='DebitNote']",
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
    });
    
    // 5. Agregar certificado X509
    sig.keyInfoProvider = {
      getKeyInfo: () => `
        <ds:KeyInfo>
          <ds:X509Data>
            <ds:X509Certificate>${this.extractCertBase64(certificatePem)}</ds:X509Certificate>
          </ds:X509Data>
        </ds:KeyInfo>
      `,
    };
    
    // 6. Firmar
    sig.computeSignature(xml);
    
    return sig.getSignedXml();
  }
}
```

## Estructura de Firma Esperada

```xml
<ext:UBLExtensions>
  <ext:UBLExtension>
    <ext:ExtensionContent>
      <ds:Signature Id="Signature" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:SignedInfo>
          <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
          <ds:Reference URI="">
            <ds:Transforms>
              <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>ABC123...</ds:DigestValue>
          </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue>DEF456...</ds:SignatureValue>
        <ds:KeyInfo>
          <ds:X509Data>
            <ds:X509Certificate>MIID...</ds:X509Certificate>
          </ds:X509Data>
        </ds:KeyInfo>
      </ds:Signature>
    </ext:ExtensionContent>
  </ext:UBLExtension>
</ext:UBLExtensions>
```

## Criterios de Aceptación
- [ ] XML firmado pasa validación de SUNAT
- [ ] Firma incluye certificado X509 completo
- [ ] Canonicalización es Exclusive C14N (no inclusive)
- [ ] Digest se calcula sobre XML canonicalizado
- [ ] Funciona con certificados SUNAT (CDT) y comerciales

## Bloquea
Task 6 (SUNAT client necesita XML firmado)

## Bloqueado Por
Task 1, Task 4

## Estimación
4-6 horas
