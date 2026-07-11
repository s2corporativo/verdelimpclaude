// Serve arquivos enviados via /api/upload (autenticado pelo middleware)
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function GET(_req: NextRequest, { params }: { params: { caminho: string[] } }) {
  try {
    const relativo = (params.caminho || []).join("/");
    const completo = path.resolve(UPLOAD_DIR, relativo);
    // Proteção contra path traversal — o caminho resolvido deve ficar dentro de UPLOAD_DIR
    if (!completo.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }
    const conteudo = await readFile(completo);
    const ext = path.extname(completo).toLowerCase();
    const tipos: Record<string, string> = {
      ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".webp": "image/webp", ".gif": "image/gif", ".xml": "application/xml", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".csv": "text/csv", ".txt": "text/plain",
    };
    return new NextResponse(conteudo as any, {
      status: 200,
      headers: {
        "Content-Type": tipos[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${path.basename(completo)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
