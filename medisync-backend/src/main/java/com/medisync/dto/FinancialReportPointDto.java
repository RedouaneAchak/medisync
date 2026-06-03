package com.medisync.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FinancialReportPointDto {
    private String label;
    private double revenue;
    private long invoiceCount;
    private long paidInvoiceCount;
}
