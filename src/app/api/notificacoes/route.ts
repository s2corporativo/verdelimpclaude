
// Adaptado de: verdelimp-erp-prime-final/server/routers.ts → notificationsRouter
// getByUser (unreadOnly), markAsRead — sistema de alertas internos
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  try {
    const hoje = new Date(); const em30 = new Date(hoje.getTime()+30*86400000); const em7 = new Date(hoje.getTime()+7*86400000);
    const notifs: any[] = [];

    // SST vencendo
    const sst = await prisma.training.findMany({ where: { expiresAt: { lte: em30 } }, include: { employee: { select: { name: true } } } });
    sst.forEach(t => {
      const dias = Math.ceil((new Date(t.expiresAt).getTime()-hoje.getTime())/86400000);
      notifs.push({ id:"sst-"+t.id, type:"sst_vencendo", title:`SST ${dias<0?"VENCIDO":"vencendo"}`, message:`${t.employee.name} — ${t.trainingType} ${dias<0?"venceu há "+Math.abs(dias)+"d":"vence em "+dias+"d"}`, urgency:dias<0?"critica":dias<7?"alta":"media", read:false, createdAt:new Date().toISOString() });
    });

    // Tributos vencendo
    const trib = await prisma.fiscalTaxExpense.findMany({ where: { status:"em_aberto", dueDate:{ lte:em7 } } });
    trib.forEach(t => {
      const dias = Math.ceil((new Date(t.dueDate).getTime()-hoje.getTime())/86400000);
      notifs.push({ id:"trib-"+t.id, type:"tributo_vencendo", title:`${t.taxType} ${dias<0?"VENCIDO":"vencendo"}`, message:`${t.taxType} ${t.competence} — R$${Number(t.totalAmount).toLocaleString("pt-BR",{minimumFractionDigits:2})} ${dias<0?"venceu há "+Math.abs(dias)+"d":"vence em "+dias+"d"}`, urgency:dias<0?"critica":"alta", read:false, createdAt:new Date().toISOString() });
    });

    // Estoque crítico
    const items = await prisma.inventoryItem.findMany({ where:{ active:true } });
    items.filter(i=>Number(i.currentQuantity)<=Number(i.minimumStock)).forEach(i => {
      notifs.push({ id:"stock-"+i.id, type:"estoque_critico", title:"Estoque crítico", message:`${i.description} — ${Number(i.currentQuantity).toFixed(0)} unid. (mín: ${Number(i.minimumStock).toFixed(0)})`, urgency:"media", read:false, createdAt:new Date().toISOString() });
    });

    // Contratos vencendo
    const contratos = await prisma.contract.findMany({ where:{ endDate:{ lte:em30 }, status:"Ativo" } });
    contratos.forEach(c => {
      const dias = Math.ceil((new Date(c.endDate).getTime()-hoje.getTime())/86400000);
      notifs.push({ id:"cont-"+c.id, type:"contrato_vencendo", title:"Contrato vencendo", message:`${c.object.substring(0,50)} — vence em ${dias} dias`, urgency:dias<15?"alta":"media", read:false, createdAt:new Date().toISOString() });
    });

    const todas = notifs.sort((a,b)=>{ const o={critica:0,alta:1,media:2}; return (o as any)[a.urgency]-(o as any)[b.urgency]; });
    return NextResponse.json({ data: unreadOnly ? todas.filter(n=>!n.read) : todas, total:todas.length, naoLidas:todas.filter(n=>!n.read).length });
  } catch {
    return NextResponse.json({ data: DEMO_NOTIF, total:DEMO_NOTIF.length, naoLidas:DEMO_NOTIF.length, _demo:true });
  }
}

const DEMO_NOTIF = [
  { id:"d1", type:"sst_vencendo", title:"SST vencendo em 32 dias", message:"Abrão Felipe — NR-12 vence em 32 dias", urgency:"media", read:false },
  { id:"d2", type:"tributo_vencendo", title:"DAS vencendo em 5 dias", message:"DAS 2026-04 — R$3.840,00 vence em 5 dias", urgency:"alta", read:false },
  { id:"d3", type:"estoque_critico", title:"Estoque crítico — Capacete", message:"EPI-002 Capacete — 8 unid. (mín: 10)", urgency:"media", read:false },
  { id:"d4", type:"contrato_vencendo", title:"Contrato vencendo em 61 dias", message:"Jardinagem Sanesul — vence em 61 dias", urgency:"media", read:false },
];
