
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

type ChartConfigForPdf = {
  chartRef: React.RefObject<HTMLElement>;
  title: string;
};

type ReportButtonProps = {
  chartsToPrint: ChartConfigForPdf[];
  reportFileName?: string;
};

export default function ReportButton({ chartsToPrint, reportFileName = 'thermo-track-report.pdf' }: ReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!chartsToPrint || chartsToPrint.length === 0 || !chartsToPrint.every(c => c.chartRef.current)) {
      toast({ title: 'Error', description: 'Report content not found or not ready.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    toast({ title: 'Generating Report...', description: 'Please wait while your PDF is being created.' });

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      for (let i = 0; i < chartsToPrint.length; i++) {
        const chartConfig = chartsToPrint[i];
        if (!chartConfig.chartRef.current) continue;

        // Temporarily ensure the chart is "visible" for html2canvas if it was off-screen
        // This might involve more complex state management if charts are truly display:none
        // For now, assuming off-screen positioning (left: -9999px) is sufficient.

        const originalScrollX = window.scrollX;
        const originalScrollY = window.scrollY;
        window.scrollTo(0, 0); // Scroll to top for consistent capture, though less critical for off-screen elements

        const canvas = await html2canvas(chartConfig.chartRef.current, {
          scale: 1.5, // Adjusted scale for better quality in PDF
          useCORS: true,
          logging: false, 
          backgroundColor: '#FFFFFF', 
          width: chartConfig.chartRef.current.offsetWidth, // Use actual width of the off-screen element
          height: chartConfig.chartRef.current.offsetHeight, // Use actual height
        });

        window.scrollTo(originalScrollX, originalScrollY);

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        
        let imgReportWidth = pdfWidth - 2 * margin;
        let imgReportHeight = (canvas.height * imgReportWidth) / canvas.width;

        if (imgReportHeight > pdfHeight - 2 * margin - 30) { // -30 for title
            imgReportHeight = pdfHeight - 2 * margin - 30;
            imgReportWidth = (canvas.width * imgReportHeight) / canvas.height;
        }

        const x = (pdfWidth - imgReportWidth) / 2;
        const y = margin + 30; // Leave space for title

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        pdf.setFontSize(14);
        pdf.text(chartConfig.title, pdfWidth / 2, margin + 10, { align: 'center' });
        pdf.addImage(imgData, 'PNG', x, y, imgReportWidth, imgReportHeight);
      }

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
    <Button onClick={handleGenerateReport} disabled={isGenerating || chartsToPrint.length === 0} className="w-full md:w-auto">
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? 'Generating Report...' : 'Download Detailed Report (PDF)'}
    </Button>
  );
}

