import { useState, useCallback } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { parseCustomerCSV, downloadCustomerCSVTemplate, CSVCustomerRow, ParseResult } from '@/utils/importCSV';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';

interface ImportCustomersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  addCustomer: (data: {
    name: string;
    address: string;
    mobile_phone: string;
    price: number;
    frequency_weeks: number;
    first_clean_date: string;
    preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
    notes?: string;
  }) => Promise<unknown>;
}

type ImportStep = 'upload' | 'preview' | 'importing';

export function ImportCustomersModal({
  open,
  onOpenChange,
  onImportComplete,
  addCustomer,
}: ImportCustomersModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importProgress, setImportProgress] = useState({ completed: 0, failed: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [failedImports, setFailedImports] = useState<Array<{ row: CSVCustomerRow; error: string }>>([]);

  const handleDownloadTemplate = () => {
    downloadCustomerCSVTemplate();
    toast({
      title: 'Template downloaded',
      description: 'Fill in the template with your customer data and upload it.',
    });
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file (.csv)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await parseCustomerCSV(file);
      setParseResult(result);
      
      if (result.validRows.length === 0) {
        toast({
          title: 'No valid customers found',
          description: result.invalidRows.length > 0
            ? 'All rows have validation errors. Please fix them and try again.'
            : 'The CSV file appears to be empty or has no valid data.',
          variant: 'destructive',
        });
        return;
      }

      if (result.invalidRows.length > 0) {
        toast({
          title: 'Some rows have errors',
          description: `${result.validRows.length} valid, ${result.invalidRows.length} invalid. Review the preview before importing.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'CSV parsed successfully',
          description: `Found ${result.validRows.length} valid customer${result.validRows.length !== 1 ? 's' : ''}.`,
        });
      }

      setStep('preview');
    } catch (error) {
      console.error('CSV parsing error:', error);
      toast({
        title: 'Failed to parse CSV',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      // Reset file input
      event.target.value = '';
    }
  }, [toast]);

  const handleImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setIsImporting(true);
    setStep('importing');
    setImportProgress({ completed: 0, failed: 0, total: parseResult.validRows.length });
    setFailedImports([]);

    const failed: Array<{ row: CSVCustomerRow; error: string }> = [];

    for (let i = 0; i < parseResult.validRows.length; i++) {
      const row = parseResult.validRows[i];
      
      try {
        await addCustomer({
          name: row.name,
          address: row.address,
          mobile_phone: row.mobile_phone || '',
          price: row.price,
          frequency_weeks: row.frequency_weeks,
          first_clean_date: row.first_clean_date,
          preferred_payment_method: row.preferred_payment_method || null,
          notes: row.notes,
        });

        setImportProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ row, error: errorMessage });
        setFailedImports(prev => [...prev, { row, error: errorMessage }]);
        setImportProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }

    setIsImporting(false);

    // Show completion toast
    const successCount = parseResult.validRows.length - failed.length;
    if (failed.length === 0) {
      toast({
        title: 'Import complete!',
        description: `Successfully imported ${successCount} customer${successCount !== 1 ? 's' : ''}.`,
      });
      handleClose();
      onImportComplete();
    } else {
      toast({
        title: 'Import completed with errors',
        description: `${successCount} imported, ${failed.length} failed. Check the details below.`,
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (isImporting) return; // Prevent closing during import
    
    setStep('upload');
    setParseResult(null);
    setImportProgress({ completed: 0, failed: 0, total: 0 });
    setFailedImports([]);
    setIsImporting(false);
    onOpenChange(false);
  };

  const handleBackToUpload = () => {
    setStep('upload');
    setParseResult(null);
    setFailedImports([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Customers from CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file with your customer data. Download the template to see the required format.'}
            {step === 'preview' && 'Review the parsed data below. Fix any errors in your CSV file before importing.'}
            {step === 'importing' && 'Importing customers... Please wait.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 py-4"
              >
                {/* Download Template Section */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 shadow-depth-2 hover:shadow-depth-3 hover:border-primary/50 transition-all duration-300 group"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Download CSV Template</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download our template to ensure your CSV file is formatted correctly.
                  </p>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="gap-2 shadow-depth-1 hover:shadow-depth-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </Button>
                </motion.div>

                {/* Upload Section */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative border-2 border-dashed border-primary rounded-xl p-8 text-center bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 shadow-depth-2 hover:shadow-depth-3 hover:border-primary/60 transition-all duration-300 group"
                >
                  <motion.div
                    animate={{ 
                      y: [0, -5, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a CSV file containing your customer data.
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild className="gap-2 cursor-pointer shadow-depth-1 hover:shadow-depth-2">
                      <span>
                        <Upload className="w-4 h-4" />
                        Choose CSV File
                      </span>
                    </Button>
                  </label>
                </motion.div>

                {/* Instructions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-border rounded-xl p-5 space-y-2 text-sm shadow-depth-1"
                >
                  <h4 className="font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    CSV Format Requirements:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li><strong className="text-foreground">Name</strong> - Required (max 100 characters)</li>
                    <li><strong className="text-foreground">Address</strong> - Required (max 500 characters)</li>
                    <li><strong className="text-foreground">Mobile</strong> - Optional (UK phone format)</li>
                    <li><strong className="text-foreground">Price</strong> - Required (accepts £ symbol, e.g., £25 or 25)</li>
                    <li><strong className="text-foreground">Frequency (Weeks)</strong> - Required (1-52, e.g., 4 for monthly)</li>
                    <li><strong className="text-foreground">First Clean Date</strong> - Required (YYYY-MM-DD format)</li>
                    <li><strong className="text-foreground">Notes</strong> - Optional</li>
                  </ul>
                </motion.div>
              </motion.div>
            )}

            {step === 'preview' && parseResult && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 py-4"
              >
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border-2 border-border rounded-xl p-4 text-center shadow-depth-2 hover:shadow-depth-3 transition-all"
                  >
                    <div className="text-2xl font-bold text-foreground">{parseResult.totalRows}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Rows</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-4 text-center shadow-depth-2 hover:shadow-depth-3 transition-all"
                  >
                    <div className="text-2xl font-bold text-green-600">{parseResult.validRows.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Valid</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-destructive/10 to-red-500/10 border-2 border-destructive/30 rounded-xl p-4 text-center shadow-depth-2 hover:shadow-depth-3 transition-all"
                  >
                    <div className="text-2xl font-bold text-destructive">{parseResult.invalidRows.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Invalid</div>
                  </motion.div>
                </div>

                {/* Invalid Rows */}
                {parseResult.invalidRows.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="border-2 border-destructive/30 rounded-xl p-4 bg-destructive/5 shadow-depth-1"
                  >
                    <h4 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Rows with Errors ({parseResult.invalidRows.length})
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {parseResult.invalidRows.map((row, idx) => (
                        <motion.div
                          key={row.rowNumber}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="bg-background rounded-lg p-3 border-2 border-destructive/20 shadow-sm"
                        >
                          <div className="font-medium text-sm mb-1 text-foreground">Row {row.rowNumber}: {row.name || '(No name)'}</div>
                          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                            {row.errors?.map((error, errorIdx) => (
                              <li key={errorIdx}>{error}</li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Valid Rows Preview */}
                {parseResult.validRows.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Valid Customers ({parseResult.validRows.length}) - Ready to Import
                    </h4>
                    <div className="border-2 border-border rounded-xl overflow-hidden shadow-depth-2 bg-card">
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-muted/50 sticky top-0">
                            <TableRow>
                              <TableHead className="font-semibold">Name</TableHead>
                              <TableHead className="font-semibold">Address</TableHead>
                              <TableHead className="font-semibold">Price</TableHead>
                              <TableHead className="font-semibold">Frequency</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parseResult.validRows.slice(0, 10).map((row, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-[200px]" title={row.address}>
                                  {row.address}
                                </TableCell>
                                <TableCell className="font-medium">£{row.price.toFixed(2)}</TableCell>
                                <TableCell>{row.frequency_weeks} weeks</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {parseResult.validRows.length > 10 && (
                          <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30 border-t">
                            ... and {parseResult.validRows.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {parseResult.validRows.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No valid customers to import. Please fix the errors above and try again.
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 py-8 text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-12 h-12 mx-auto text-primary" />
                </motion.div>
                <div>
                  <div className="text-lg font-semibold mb-2 text-foreground">Importing customers...</div>
                  <div className="text-sm text-muted-foreground">
                    {importProgress.completed + importProgress.failed} of {importProgress.total} completed
                  </div>
                </div>
                {importProgress.total > 0 && (
                  <div className="w-full bg-muted/50 rounded-full h-3 shadow-depth-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((importProgress.completed + importProgress.failed) / importProgress.total) * 100}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary via-primary to-primary/90 rounded-full shadow-depth-1"
                    />
                  </div>
                )}
                {failedImports.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-left bg-destructive/5 border-2 border-destructive/20 rounded-xl p-4"
                  >
                    <div className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Failed imports ({failedImports.length}):
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto text-xs">
                      {failedImports.map((failed, idx) => (
                        <div key={idx} className="text-muted-foreground bg-background rounded p-2 border border-destructive/10">
                          <span className="font-medium">Row {failed.row.rowNumber}</span> ({failed.row.name}): {failed.error}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {step === 'preview' && parseResult && (
              <Button
                variant="outline"
                onClick={handleBackToUpload}
                disabled={isImporting}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              {step === 'upload' ? 'Cancel' : 'Close'}
            </Button>
            {step === 'preview' && parseResult && parseResult.validRows.length > 0 && (
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {parseResult.validRows.length} Customer{parseResult.validRows.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

