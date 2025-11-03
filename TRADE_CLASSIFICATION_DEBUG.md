# Trade Classification Debug Progress

## Issue

Selling a call is showing as "Sell Cash Secured Put" phase instead of showing covered call phase.

## Test Case

- Symbol: ASTS
- Type: Call
- Side: Sell
- Qty: 1
- Strike: 82
- Premium: 1.03
- DTE: 4

## Investigation Steps

### ✅ Step 1: Create this tracking document

- [x] Document created

### ⏳ Step 2: Trace trade submission

- [ ] Find exact function called on "+ Add Trade" button click
- [ ] Verify parameters passed to addOption()
- [ ] Check what gets passed to addJournal()
- [ ] Findings:

### ⏳ Step 3: Verify journal entry creation

- [ ] Check journal store for new entry
- [ ] Verify 'kind' field value
- [ ] Check if it's 'sell_call' or 'sell_put'
- [ ] Findings:

### ⏳ Step 4: Trace journal → positions sync

- [ ] Find where journal entries convert to positions
- [ ] Check deriveWheelState() function
- [ ] Verify position type is set correctly
- [ ] Findings:

### ⏳ Step 5: Debug phaseFor() function

- [ ] Check what phaseFor('ASTS') returns
- [ ] Verify hasShortCalls value
- [ ] Check pos array contents for ASTS
- [ ] Findings:

### ⏳ Step 6: Implement fix

- [ ] Identify exact line causing issue
- [ ] Implement correction
- [ ] Test with original scenario
- [ ] Findings:

### ⏳ Step 7: Verify fix

- [ ] Enter same trade (Sell 1 ASTS Call $82)
- [ ] Check "Wheel Phase" displays correctly
- [ ] Verify other phases still work
- [ ] Results:

## Findings Summary

<!-- Update after each step -->

## Fix Implementation

<!-- Document the fix once identified -->

## Test Results

<!-- Document test results -->
