/**
 * Client-side PDF signing using @signpdf and pdf-lib.
 *
 * The signing process:
 * 1. Parse the P12/PFX certificate with the user's password.
 * 2. Add a PKCS#7 signature placeholder to the PDF (pdf-lib).
 * 3. Sign the PDF bytes with the private key (@signpdf/signer-p12).
 *
 * Everything runs entirely in the browser. The private key never leaves the device.
 */

import { PDFDocument } from 'pdf-lib';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import signpdf from '@signpdf/signpdf';
import forge from 'node-forge';

/**
 * Extract human-readable info from a forge certificate.
 * @param {forge.pki.Certificate} cert
 * @returns {{ commonName: string, organization: string, email: string, validFrom: Date, validTo: Date }}
 */
function getCertInfoFromForge(cert) {
  const getAttr = (attrs, name) =>
    attrs.find((a) => a.name === name || a.shortName === name)?.value || '';
  return {
    commonName: getAttr(cert.subject.attributes, 'commonName'),
    organization: getAttr(cert.subject.attributes, 'organizationName'),
    email: getAttr(cert.subject.attributes, 'emailAddress'),
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
  };
}

/**
 * Validate and extract certificate metadata from a P12/PFX file without signing.
 * Useful for showing cert info to the user before they confirm the operation.
 *
 * @param {ArrayBuffer} p12Buffer Raw bytes of the .p12 / .pfx file
 * @param {string} password Certificate password
 * @returns {{ commonName: string, organization: string, email: string, validFrom: Date, validTo: Date }}
 * @throws {Error} If password is wrong or file is invalid
 */
export function parseCertificateInfo(p12Buffer, password) {
  const p12Der = forge.util.createBuffer(p12Buffer);
  const p12Asn1 = forge.asn1.fromDer(p12Der);

  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  } catch (err) {
    if (/mac|verify|password|pkcs12/i.test(err.message)) {
      throw new Error('Contraseña incorrecta o certificado dañado.');
    }
    throw err;
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBagList = certBags[forge.pki.oids.certBag] || [];
  if (certBagList.length === 0) {
    throw new Error('No se encontraron certificados en el archivo.');
  }

  return getCertInfoFromForge(certBagList[0].cert);
}

/**
 * Sign a PDF document with a P12/PFX certificate entirely in the browser.
 *
 * @param {Uint8Array} pdfBytes      Original PDF bytes
 * @param {ArrayBuffer} p12Buffer    Raw P12/PFX file bytes
 * @param {string} password          Certificate password
 * @param {object} [signerInfo]      Optional signer name/location metadata to embed
 * @param {string} [signerInfo.name]
 * @param {string} [signerInfo.location]
 * @param {string} [signerInfo.reason]
 * @returns {Promise<Uint8Array>} Signed PDF bytes
 */
export async function signPdf(pdfBytes, p12Buffer, password, signerInfo = {}) {
  // 1. Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // 2. Add signature placeholder
  const signatureLength = parseInt(import.meta.env.PUBLIC_SIGNATURE_LENGTH, 10) || 32768;
  await pdflibAddPlaceholder({
    pdfDoc,
    reason: signerInfo.reason || 'Firma de documento',
    contactInfo: signerInfo.email || '',
    name: signerInfo.name || '',
    location: signerInfo.location || '',
    signatureLength,
  });

  // 3. Serialize PDF with placeholder
  const pdfWithPlaceholderBytes = await pdfDoc.save({ useObjectStreams: false });

  // 4. Create the P12 signer (browser-compatible)
  const p12Uint8 = new Uint8Array(p12Buffer);
  const signer = new P12Signer(p12Uint8, { passphrase: password });

  // 5. Sign
  try {
    const signedBytes = await signpdf.sign(
      Buffer.from(pdfWithPlaceholderBytes),
      signer
    );
    return new Uint8Array(signedBytes);
  } catch (err) {
  
    if (/mac|password|passphrase|verification|pkcs12/i.test(err.message)) {
      throw new Error('Contraseña incorrecta. Comprueba la contraseña del certificado.');
    }
    throw err;
  }
}
