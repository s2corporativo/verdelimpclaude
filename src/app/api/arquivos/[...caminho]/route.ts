// Serve arquivos enviados via /api/upload (autenticado pelo middleware + sessão no handler)
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { exigirPapel } from "@/lib/authz";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Só imagens e PDF são exibidos inline; todo o resto baixa como anexo
// (evita XML/HTML interpretado pelo navegador como conteúdo ativo).
const INLINE_SEGURO = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export async function GET(_req: NextRequest, { params }: { params: { caminho: string[] } }) {
  const { erro } = await exigirPapel(); // defesa em profundidade além do middleware
  if (erro) return erro;

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
    const disposition = INLINE_SEGURO.has(ext) ? "inline" : "attachment";
    return new NextResponse(conteudo as any, {
      status: 200,
      headers: {
        "Content-Type": tipos[ext] || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${path.basename(completo)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
