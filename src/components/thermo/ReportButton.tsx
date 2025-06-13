
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

export default function ReportButton({ reportContentRef, reportFileName = 'thermo-track-report.pdf', reportTitle = "ThermoTrack Report" }: ReportButtonProps) {
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
      const originalScrollX = window.scrollX;
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(reportContentRef.current, {
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: 'hsl(var(--card))', // Ensure background is captured if transparent
        onclone: (document) => {
            // Potentially apply styles for consistent PDF rendering if needed
            const chartContainer = document.querySelector('.recharts-responsive-container');
            if(chartContainer && chartContainer.parentElement) {
                chartContainer.parentElement.style.backgroundColor = 'hsl(var(--card))';
            }
        }
      });
      
      window.scrollTo(originalScrollX, originalScrollY);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape', // Changed to landscape
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;

      const margin = 40; 
      let newImgWidth = pdfWidth - 2 * margin;
      let newImgHeight = (imgHeight * newImgWidth) / imgWidth;

      if (newImgHeight > pdfHeight - 2 * margin - 30) { // -30 for title space
        newImgHeight = pdfHeight - 2 * margin - 30;
        newImgWidth = (imgWidth * newImgHeight) / imgHeight;
      }
      
      const x = (pdfWidth - newImgWidth) / 2;
      const y = margin + 20; // Top margin + space for title

      pdf.setFontSize(16);
      pdf.text(reportTitle, pdfWidth / 2, margin, { align: 'center' });
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
      {isGenerating ? 'Generating PDF...' : 'Download Chart (PDF)'}
    </Button>
  );
}
