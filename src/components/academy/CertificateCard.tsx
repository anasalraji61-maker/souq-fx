import React from 'react';
import { CertificateItem } from '../../api/academy';
import { Award, Printer, X } from 'lucide-react';

interface CertificateCardProps {
  certificate: CertificateItem;
  onClose: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({ certificate, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-[#0B1220] border-2 border-[#E8B86D]/60 rounded-2xl shadow-2xl overflow-hidden p-8 text-center text-[#E8EEF9] print:border-none print:shadow-none print:p-8 print:bg-white print:text-black">
        {/* Close Button (hidden during print) */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg bg-[#141E30] hover:bg-[#1E2B44] text-[#7B8DA8] hover:text-white transition-colors print:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Decorative Luxury Border Corners */}
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#E8B86D]" />
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#E8B86D]" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#E8B86D]" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#E8B86D]" />

        {/* Header Ribbon & Emblem */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E8B86D] to-[#F59E0B] flex items-center justify-center text-[#0B1220] shadow-lg mb-3">
            <Award className="w-10 h-10" />
          </div>
          <span className="text-[11px] font-mono tracking-widest text-[#E8B86D] uppercase">
            MATRIX Trading Academy • شهادة إتمام معتمدة
          </span>
          <h2 className="text-2xl font-black text-[#E8B86D] mt-1 tracking-tight print:text-black">
            شهادة تفوق وإتقان
          </h2>
          <p className="text-xs text-[#7B8DA8] mt-1 print:text-gray-600">
            يشهد مجلس أكاديمية MATRIX بأن المتدرب قد أتم بنجاح كافة متطلبات الدورة التدريبية
          </p>
        </div>

        {/* Student Name */}
        <div className="my-6 py-3 border-y border-[#1E283D] print:border-gray-300">
          <span className="text-xs text-[#7B8DA8] block mb-1">تُمنح هذه الشهادة لـ:</span>
          <h3 className="text-xl font-bold text-white tracking-wide print:text-black">
            {certificate.student_name}
          </h3>
        </div>

        {/* Course Name */}
        <div className="mb-6">
          <span className="text-xs text-[#7B8DA8] block mb-1">عن اجتياز مسار:</span>
          <h4 className="text-lg font-bold text-[#2DD4BF] print:text-black">
            {certificate.course_name}
          </h4>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] font-bold text-xs border border-[#10B981]/30">
            {certificate.grade || 'امتياز وتفوق (100% Completed)'}
          </span>
        </div>

        {/* Signatures & Verification ID */}
        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[#1E283D] text-xs text-[#7B8DA8] print:border-gray-300 print:text-gray-700">
          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-[10px] text-[#A3B4D0]">تاريخ الإصدار:</span>
            <span className="font-semibold text-white print:text-black">{certificate.issued_at}</span>
            <div className="mt-4 w-28 h-[1px] bg-[#334155] print:bg-gray-400" />
            <span className="text-[10px] mt-1 text-[#64748B]">توقيع إدارة التدريب</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-[10px] text-[#A3B4D0]">رقم التحقق المعتمد:</span>
            <span className="font-mono font-bold text-[#E8B86D] print:text-black">{certificate.id}</span>
            <div className="mt-4 w-28 h-[1px] bg-[#334155] print:bg-gray-400" />
            <span className="text-[10px] mt-1 text-[#64748B]">رمز المصادقة الرقمية</span>
          </div>
        </div>

        {/* Action Buttons (Print / Close) */}
        <div className="mt-8 flex items-center justify-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E8B86D] to-[#F59E0B] text-[#0B1220] font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الشهادة (Print)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
