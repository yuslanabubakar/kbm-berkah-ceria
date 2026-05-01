-- Allow the participant who paid an expense to insert splits on it.
-- This enables the "food stop" feature where the payer records each person's bill.

CREATE POLICY "payer insert splits" ON public.expense_splits
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT id FROM public.expenses
      WHERE paid_by IN (
        SELECT id FROM public.participants WHERE user_id = auth.uid()
      )
    )
  );
