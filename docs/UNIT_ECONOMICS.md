# Jaime AI — Unit Economics Model

*Last Updated: February 15, 2026*

---

## 1. Cost Structure Overview

### Variable Costs (Per Video Generated)

| Cost Component | Est. Range | Notes |
|----------------|------------|-------|
| **LipDub API** | $0.50 - $2.00/min | Primary cost driver. Depends on video length + quality tier |
| **Supabase Storage** | $0.025/GB/month | Stores source videos + generated outputs |
| **Supabase Bandwidth** | $0.09/GB | Downloading generated videos |
| **Vercel Hosting** | $0.40 - $0.60/GB | Edge bandwidth for video delivery |

### Fixed Costs (Monthly)

| Component | Cost | Purpose |
|-----------|------|---------|
| Supabase Pro | $25/mo | Database, auth, storage baseline |
| Vercel Pro | $20/mo | Hosting + serverless functions |
| LipDub API (base) | $0 | Pay-per-use, no monthly minimum |
| **Total Fixed** | **~$45/mo** | Break-even: ~23 videos at $2 cost |

---

## 2. Unit Economics by Video Length

### Assumptions
- Average video length: 1 minute
- LipDub cost: $1.00/min (mid-range estimate)
- Storage: 50MB per video (source + output)
- Bandwidth: 2x downloads per video (retry/review)

### Cost Per Video (1-minute)

| Component | Calculation | Cost |
|-----------|-------------|------|
| LipDub API | 1 min × $1.00 | $1.00 |
| Storage (monthly) | 0.05 GB × $0.025 | $0.001 |
| Bandwidth (2 downloads) | 0.1 GB × $0.09 | $0.009 |
| Vercel Delivery | 0.1 GB × $0.50 | $0.05 |
| **Total COGS** | | **~$1.06** |

### Cost Per Video (30 seconds)

| Component | Calculation | Cost |
|-----------|-------------|------|
| LipDub API | 0.5 min × $1.00 | $0.50 |
| Storage | 0.025 GB × $0.025 | $0.0006 |
| Bandwidth | 0.05 GB × $0.09 | $0.0045 |
| Vercel | 0.05 GB × $0.50 | $0.025 |
| **Total COGS** | | **~$0.53** |

---

## 3. Pricing Tiers Analysis

### Current Pricing (from database schema)

| Plan | Monthly Price | Credits | Price/Credit | Implied Video Cost |
|------|--------------|---------|--------------|-------------------|
| Free Trial | $0 | 20 | $0.00 | Loss leader |
| Starter | $29 | 100 | $0.29 | Cost: $0.53-1.06 |
| Pro | $99 | 500 | $0.20 | Cost: $0.53-1.06 |
| Enterprise | Custom | Unlimited | - | Custom margin |

### Profitability Analysis

#### Starter Plan ($29/mo, 100 credits)

| Metric | Value |
|--------|-------|
| Revenue per credit | $0.29 |
| COGS per video (1min) | $1.06 |
| **Gross Margin** | **-266%** ❌ |
| Break-even utilization | ~27 videos (27% of credits) |

#### Pro Plan ($99/mo, 500 credits)

| Metric | Value |
|--------|-------|
| Revenue per credit | $0.20 |
| COGS per video (1min) | $1.06 |
| **Gross Margin** | **-430%** ❌ |
| Break-even utilization | ~94 videos (19% of credits) |

---

## 4. The Problem: Credit Pricing Too Low

**Current credit value ($0.20-0.29) is far below estimated COGS ($0.53-1.06)**

### Options to Fix:

#### Option A: Reduce Credit Value (More Credits per Dollar)
- Starter: 100 → 30 credits ($0.97/credit)
- Pro: 500 → 120 credits ($0.83/credit)
- Maintains current price points, reduces burn

#### Option B: Increase Price (Same Credits)
- Starter: $29 → $99 (100 credits = $0.99/credit)
- Pro: $99 → $499 (500 credits = $1.00/credit)
- Matches HeyGen/HeyReach pricing

#### Option C: Hybrid — Pay-per-minute + Credits
- Base fee: $49/mo (platform access)
- Per-minute charge: $1.50/min (pass-through LipDub + 50% margin)
- Credits become "discount tokens" not full coverage

---

## 5. Recommended Unit Economics (Option C Hybrid)

### New Pricing Structure

| Plan | Monthly | Includes | Per-Minute Rate |
|------|---------|----------|-----------------|
| **Starter** | $49 | 30 min included | $1.50/min after |
| **Pro** | $149 | 100 min included | $1.25/min after |
| **Enterprise** | $499 | 400 min included | $1.00/min after |

### Economics (Starter Plan)

| Metric | Calculation | Value |
|--------|-------------|-------|
| Monthly Revenue | | $49.00 |
| Included Minutes | | 30 min |
| LipDub Cost | 30 × $1.00 | $30.00 |
| Fixed Costs | | $45/avg users |
| **Gross Profit** | $49 - $30 - $3 | **$16** ✅ |
| **Gross Margin** | | **33%** |

### Per-Minute Breakdown

| Component | Cost | Charge | Margin |
|-----------|------|--------|--------|
| LipDub API | $1.00 | $1.50 | 50% |
| Storage + Bandwidth | $0.06 | Included | - |
| Platform margin | - | $0.44 | - |

---

## 6. Key Metrics to Track

### Unit Metrics
- **CAC**: Customer acquisition cost (target: < 3 months revenue)
- **LTV**: Lifetime value (target: > 3× CAC)
- **Churn**: Monthly cancellation rate (target: < 5%)
- **Utilization**: % of included credits used (target: 60-80%)

### Operational Metrics
- **Video completion rate**: % of uploads that generate successfully
- **Avg video length**: Impacts COGS directly
- **Re-download rate**: Bandwidth cost multiplier
- **Support tickets per user**: Cost of service

### Break-Even Analysis

| Users | Revenue (Starter) | COGS | Fixed | Profit |
|-------|------------------|------|-------|--------|
| 1 | $49 | $30 | $45 | -$26 |
| 10 | $490 | $300 | $45 | $145 |
| 50 | $2,450 | $1,500 | $60 | $890 |
| 100 | $4,900 | $3,000 | $100 | $1,800 |

**Break-even: ~2 paying customers** (ignoring fixed costs, purely variable)

---

## 7. Action Items

1. **Confirm LipDub pricing** — Get exact per-minute rates
2. **Update pricing page** — Implement Option C structure
3. **Add usage tracking** — Meter actual minutes per user
4. **Set up Stripe** — For subscription billing + overage charges
5. **Create usage alerts** — Notify users at 80% of included minutes

---

## 8. Competitive Benchmarks

| Competitor | Pricing Model | Per-Minute Rate |
|------------|--------------|-----------------|
| HeyGen | $29-89/mo + usage | ~$2-3/min |
| Synthesia | $22-67/mo + usage | ~$3-5/min |
| Loom (personalization) | Free-$15/mo | N/A |
| **Jaime (current)** | $29-99 flat | ~$0.20-0.29/credit ❌ |
| **Jaime (proposed)** | $49-149 + usage | $1.00-1.50/min ✅ |

---

*Next: Get real LipDub pricing to refine these numbers.*
