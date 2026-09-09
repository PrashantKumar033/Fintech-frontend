# UMOBIPAY Admin Feature Reference

This inventory is derived from the legacy `umobipay.com` admin screenshots supplied on 2 September 2026. It is a product-scope reference only. The current admin console's modern design remains the visual foundation, and a feature becomes functional only after its corresponding backend contract and permission checks are verified.

## Main navigation groups (10)

1. Dashboard
2. Member Management
3. KYC
4. Commission Setup
5. Wallet Report
6. All Report
7. API Setting
8. Setting
9. Legal Document
10. SMS Setting

## Visible legacy feature inventory

### Dashboard

- Role/member counts: Admin, Master Distributor, Distributor and Retailer
- Main and AEPS wallet summaries
- Operational/service summary cards
- API balance selector
- Date selector
- Create plan
- Quick search
- Alerts and pending-action counters

### Member Management

- New staff registration
- Staff registration list
- Set member password
- Set member transaction PIN
- Login security
- Hold amount
- Credit limit
- Registration
- Manage member
- Balance transfer
- Assign TID
- Reversal report
- Provider onboarding
- Lead report

### KYC

- KYC list
- KYC master/configuration
- Upload downline KYC
- KYC details and review

### Commission Setup

- Commission rules
- API/service commission range
- Package, service and operator selection
- Slab ranges
- Role-based commission/surcharge/percentage/fixed values

### Wallet Report

- Commission reports
- Main wallet
- Wallet summary
- Fund transfer
- Main wallet report
- Wallet transactions
- AEPS wallet report
- Downline balance

### All Report

- AEPS history
- DMT history
- Payout history
- MATM history
- Recharge history
- BBPS history
- Credit-card bill-payment history
- UPI history
- Dispute recharge report
- Queued recharge
- Business summary
- Earnings/commission downline
- NSDL history
- DMT PPI history
- Money remitter details
- Money wallet-load history
- Wallet PPI registration
- Quick search
- TDS report
- Payment-gateway history
- Cash-deposit history

### API Setting

- API list
- API balances
- Automatic API switching
- Automation
- Add API
- Switch system

### Setting

- Manage company
- Member capping price
- Roles
- Assign package
- Services
- Upload banner
- Manage operator
- Company bank details
- Permission setting
- Complaint list
- DMT bank master
- Service design
- Change/assign role
- Employee login security
- Parent change
- Menu order
- Manage news
- Member bank details
- Menu assignment
- Manage permissions
- Assign service
- Assign service to role
- Add menu
- Fund requests
- Enable/disable services
- Operator list
- AEPS onboarding list
- Add BBPS fields
- Check transaction
- Packages

### Legal Document

- Terms and conditions
- Privacy policy
- Refund policy
- Security tips
- Rich-text content editor and publication list

### SMS Setting

- SMS categories
- SMS templates
- SMS provider/integration configuration

## Implementation rule

- Preserve the current modern admin dashboard and design system.
- Use this list to plan navigation and future modules, not to copy the legacy visual design.
- Show each major area as its own module; do not combine unrelated Bank, KYC, AEPS or settings workflows on one screen.
- Wire live controls only to verified, role-protected gateway APIs.
- Mark unsupported modules as planned/demo and keep mutations disabled until backend support exists.
- Apply role/permission-based visibility when the real admin authentication contract is connected.
