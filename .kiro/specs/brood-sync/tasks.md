# Kiro - Tasks: brood-sync (reconciled 16 Nov 2026)

Ticked = verified present in code on 16 Nov. Not ticked = not true yet.

## Built before Kiro (see docs/PROVENANCE.md)
- [x] R1.1 one child per egg (`children.egg_id unique`)
- [x] R1.3 RLS on carers, eggs, children, scrapbook_entries, check_ins
- [x] R2.1-2.2 ready state, naming creates child (`nameHagglingSynced`)
- [x] R3.1 claim code minted (`mintPhoneTransfer`, stored on child)
- [x] R3.2 phone claim by code for owning carer (`claimChildByTransferCode`)
- [x] R4.1 check-in writes `check_ins` and updates child (`pushCheckIn`)
- [x] R4.2 local decay while offline (`tickHaggling`, `tickPhoneChild`)
- [x] R5.1-5.2 mother lists brood only; care is on the nest
- [x] R5.3 `claim_my_eggs_by_email` on sign-in

## Open (owned by other specs)
- [ ] R2.3 traits immutable after hatch -> sync-conflict T6
- [ ] R3.3 uniform refusal message -> security-hardening T5
- [ ] R3.4 code expiry + single use -> security-hardening T5
- [ ] R4.2 reconcile rules on reconnect -> sync-conflict T3-T5
