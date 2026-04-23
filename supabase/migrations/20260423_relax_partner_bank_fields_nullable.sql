-- Non-NZ partners only supply a Wise email, not NZ bank details.
-- Relax the NOT NULL constraint on the bank fields so the form can skip them.
ALTER TABLE partners ALTER COLUMN bank_account_name DROP NOT NULL;
ALTER TABLE partners ALTER COLUMN bank_account_number_encrypted DROP NOT NULL;
