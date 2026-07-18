// pdf-parse não publica tipos para o entrypoint interno (usamos
// lib/pdf-parse.js para não disparar o harness de debug do index.js).
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
  }
  function pdfParse(data: Buffer, options?: { max?: number }): Promise<PdfParseResult>;
  export default pdfParse;
}
