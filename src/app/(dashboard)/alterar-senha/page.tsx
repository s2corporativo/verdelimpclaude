// Redireciona para a rota canônica /dashboard/alterar-senha
// Esta página era um duplicato em /(dashboard)/alterar-senha
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function AlterarSenhaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/alterar-senha"); }, [router]);
  return null;
}
