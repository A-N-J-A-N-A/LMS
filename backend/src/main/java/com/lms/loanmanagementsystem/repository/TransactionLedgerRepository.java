package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.TransactionLedger;
import com.lms.loanmanagementsystem.model.TransactionType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TransactionLedgerRepository
        extends MongoRepository<TransactionLedger, String> {

    boolean existsByLoanIdAndTransactionType(String loanId, TransactionType transactionType);
    List<TransactionLedger> findByLoanIdOrderByTimestampDesc(String loanId);
    List<TransactionLedger> findByLoanIdAndTransactionTypeOrderByTimestampAsc(String loanId, TransactionType transactionType);

    List<TransactionLedger> findByLoanId(String loanId);

}
