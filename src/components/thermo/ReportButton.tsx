'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

type ReportButtonProps = {
  reportContentRef: React.RefObject<HTMLElement>;
  reportFileName?: string;
  reportTitle?: string;
};

export default function ReportButton({ reportContentRef, reportFileName = 'thermo-track-report.pdf', reportTitle = "ThermoTrack Monthly Report" }: ReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!reportContentRef.current) {
      toast({ title: 'Error', description: 'Report content not found.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    toast({ title: 'Generating Report...', description: 'Please wait while your PDF is being created.' });

    try {
      // Temporarily increase resolution for better quality
      const originalScrollX = window.scrollX;
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0); // Scroll to top-left for consistent capture

      const canvas = await html2canvas(reportContentRef.current, {
        scale: 2, // Increase scale for better resolution
        useCORS: true,
        logging: false, //reduce console noise
        onclone: (document) => {
            // Apply styles to ensure visibility of elements in the cloned document if needed
            // e.g., if some elements are styled based on parent visibility
        }
      });
      
      window.scrollTo(originalScrollX, originalScrollY); // Restore scroll position

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt', // points
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;

      // Calculate scaling to fit image within PDF page (maintaining aspect ratio)
      let newImgWidth = imgWidth;
      let newImgHeight = imgHeight;
      const margin = 40; // 20pt margin on each side

      if (imgWidth > pdfWidth - 2 * margin) {
        newImgWidth = pdfWidth - 2 * margin;
        newImgHeight = (imgHeight * newImgWidth) / imgWidth;
      }
      if (newImgHeight > pdfHeight - 2 * margin) {
        newImgHeight = pdfHeight - 2 * margin;
        newImgWidth = (imgWidth * newImgHeight) / imgHeight;
      }
      
      // Center the image
      const x = (pdfWidth - newImgWidth) / 2;
      const y = margin; // Top margin

      pdf.setFontSize(18);
      pdf.text(reportTitle, pdfWidth / 2, margin / 2, { align: 'center' });
      pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
      pdf.save(reportFileName);

      toast({ title: 'Report Generated', description: 'Your PDF report has been downloaded.' });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({ title: 'Error Generating Report', description: error.message || 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleGenerateReport} disabled={isGenerating} className="w-full md:w-auto">
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? 'Generating PDF...' : 'Download Report (PDF)'}
    </Button>
  );
}
