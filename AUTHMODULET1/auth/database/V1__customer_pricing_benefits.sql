-- Apply to the authandcust database before deploying the matching Auth service revision.
ALTER TABLE cust_dtl
    ADD COLUMN CUST_BANK_EMPLOYEE BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN CUST_PREMIUM_WEALTH BOOLEAN NOT NULL DEFAULT FALSE;
