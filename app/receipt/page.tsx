"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { buildReceipt, RECEIPT_POLICY_NOTES, type ReceiptData } from "@/lib/receipt";
import { formatVnd } from "@/lib/utils";

function useReceiptId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get("id"));
  }, []);
  return id;
}

function longDate(day: string) {
  return `Ngày ${day.slice(8)} tháng ${day.slice(5, 7)} năm ${day.slice(0, 4)}`;
}

export default function ReceiptPage() {
  const paymentId = useReceiptId();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    buildReceipt(paymentId).then((r) => {
      if (!alive) return;
      setData(r);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      {!ready ? (
        <p className="py-20 text-center text-sm text-slate-500">Đang tải phiếu…</p>
      ) : !data ? (
        <p className="py-20 text-center text-sm text-slate-500">Không tìm thấy khoản thu.</p>
      ) : (
        <article className="mx-auto max-w-[210mm] bg-white px-10 py-8 text-[13px] leading-relaxed text-black shadow-xl print:shadow-none" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          <header className="flex items-start justify-between gap-4 border-b border-slate-300 pb-3">
            <div>
              <p className="text-lg font-bold uppercase tracking-wide">{data.studioName}</p>
              {data.branches.length > 0 ? (
                data.branches.map((b) => (
                  <p key={b.id} className="text-xs">{b.name}: {b.address}</p>
                ))
              ) : (
                <p className="text-xs">{data.studioAddress}</p>
              )}
              {data.studioEmail ? <p className="text-xs">Mail: {data.studioEmail}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm">Số: <span className="inline-block bg-amber-100 px-2 font-bold">{data.receiptNo}</span></p>
            </div>
          </header>

          <div className="mt-4 text-center">
            <h1 className="text-xl font-bold uppercase">Phiếu xác nhận học phí</h1>
            <p className="mt-1 text-sm italic">{longDate(data.day)}</p>
          </div>

          <section className="mt-5">
            <h2 className="font-bold underline">A. Thông tin học viên</h2>
            <div className="mt-1 grid grid-cols-2 gap-x-6">
              <p><b>Họ và tên:</b> {data.studentName}</p>
              <p><b>Hình thức TT:</b> {data.payForm}</p>
              <p><b>Điện thoại:</b> {data.studentPhone || "—"}</p>
              <p><b>Phương thức TT:</b> {data.methodLabel}</p>
            </div>
          </section>

          <section className="mt-4">
            <h2 className="font-bold underline">B. Thông tin đăng ký</h2>
            <p className="mt-1"><b>Lớp học:</b> {data.courseLabel}</p>
            <p><b>CN học:</b> {data.branchLabel}</p>
          </section>

          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                {["Gói", "Học phí", "Phải thu", "Đã đóng", "Còn lại"].map((h) => (
                  <th key={h} className="border border-slate-400 px-2 py-1.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 px-2 py-1.5 text-center">{data.planName}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-center tabular-nums">{formatVnd(data.price)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-center tabular-nums">{formatVnd(data.due)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-center tabular-nums">{formatVnd(data.paid)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-center tabular-nums">{formatVnd(data.remaining)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-sm italic">Bằng chữ: {data.amountInWords}</p>

          <section className="mt-4">
            <h2 className="font-bold underline">Note / Ghi chú</h2>
            {RECEIPT_POLICY_NOTES.map((section) => (
              <div key={section.title} className="mt-1.5">
                <p className="font-bold">{section.title}</p>
                {section.items.map((item) => (
                  <p key={item} className="pl-3">- {item}</p>
                ))}
              </div>
            ))}
          </section>

          <section className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="font-bold">Ngườờ nộp tiền</p>
              <p className="mt-14">{data.payerName}</p>
            </div>
            <div>
              <p className="font-bold">Ngườờ tư vấn</p>
              <p className="mt-14">—</p>
            </div>
            <div>
              <p className="font-bold">Ngườờ lập phiếu</p>
              <p className="mt-14">{data.staffName || "—"}</p>
            </div>
          </section>
        </article>
      )}

      <div className="no-print fixed bottom-5 right-5">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-500)] px-5 text-sm font-semibold text-white shadow-lg"
        >
          <Printer size={16} />
          In phiếu
        </button>
      </div>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
