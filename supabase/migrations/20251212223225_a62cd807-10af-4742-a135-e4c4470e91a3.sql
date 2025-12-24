-- Add notes column to customers table for gate codes, pet warnings, special instructions
ALTER TABLE public.customers 
ADD COLUMN notes TEXT;