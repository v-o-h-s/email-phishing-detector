# Email Spoofing Detection Guide

Email spoofing is the forgery of an email header so that the message appears to have originated from someone or somewhere other than the actual source. Because the core email protocol (SMTP) lacks built-in authentication, malicious actors can easily fake the visible `From:` address.

To combat this, the email industry developed a trio of foundational authentication protocols, often referred to as the "Big Three": **SPF, DKIM, and DMARC**. 

Here is an explanation of these protocols and other tools used to detect if an email is spoofed.

## 1. The Big Three Protocols

### A. SPF (Sender Policy Framework)
* **What it does:** Verifies that the server sending the email is authorized to send emails on behalf of that domain.
* **How it works (Normal Flow):** The domain owner publishes a DNS record (a TXT record) listing the IP addresses of servers allowed to send emails for their domain. When an email arrives, the receiving server checks if the sender's IP address matches the IP list in the domain's SPF record.

#### The SPF Bypass (The "Envelope vs. Visible Letter" Loophole)
The fatal flaw in SPF is that **it only checks the hidden Envelope address and completely ignores the visible Letter address.**
Think of an email like a physical letter. It has an **Outer Envelope** (with hidden routing instructions called the `Return-Path`) and a **Letter Inside** (with the visible `From:` address you see in your email app). 

Here is how an attacker exploits this without hacking the victim's DNS:
1. **The Hacker's Setup:** The attacker buys a cheap, throwaway domain (`attacker-domain.com`). They set up a valid SPF record authorizing their own hacker server (e.g., IP `9.9.9.9`) on *their own* DNS. 
2. **Crafting the Fake Email:** The attacker sends a malicious email from their server. 
   * They set the **Outer Envelope** (hidden) to: `bounce@attacker-domain.com`
   * They set the **Letter Inside** (visible) to: `security@bank.com`
3. **The Flawed Check:** The receiving server (e.g., Gmail) receives the email and *only* looks at the Outer Envelope. It asks DNS for `attacker-domain.com`'s SPF record. The record says IP `9.9.9.9` is allowed.
4. **The Result:** **SPF PASSES.** Gmail's security check is satisfied because technically, the attacker's server is authorized to send for the attacker's domain.
5. **The Victim:** Gmail drops the email in the inbox. The victim's email app throws away the Outer Envelope and only shows the Letter Inside: `From: security@bank.com`. The victim is successfully spoofed.

*(Note: This exact loophole is why DMARC was invented—to force the Envelope and Letter domains to match).*

### B. DKIM (DomainKeys Identified Mail)
* **What it does:** Ensures the email content has not been tampered with in transit and verifies the sender's domain using cryptography.
* **How it works:** The sending server signs the email (headers and body) using a private cryptographic key. The receiver looks up the domain's public key (published in DNS) to verify the signature. If it matches, it proves the email truly passed through that domain's infrastructure and wasn't altered.
* **The Flaw:** Like SPF, DKIM doesn't care about the visible `From:` address. A spammer can sign an email using their own domain's DKIM key while faking the visible `From:` address.

### C. DMARC (Domain-based Message Authentication, Reporting, and Conformance)
* **What it does:** This is the ultimate boss. DMARC ties SPF and DKIM together to protect the visible `From:` address that users actually see. It also tells the receiving server what to do if an email fails authentication.
* **How it works (Alignment):** DMARC requires **Alignment**. It checks to see if the domain validated by SPF and/or DKIM matches the domain in the visible `From:` address. 
    * If an email passes SPF/DKIM but the domains don't match the `From:` address, DMARC fails.
* **How it works (Policy):** The domain owner publishes a DMARC DNS record defining a policy (`p=none`, `p=quarantine`, or `p=reject`):
    * `none`: Monitor only (deliver the email but send a report to the domain owner).
    * `quarantine`: Send the spoofed email to the Spam folder.
    * `reject`: Block the spoofed email entirely so it never reaches the inbox.

## 2. Modern Extension Protocols

### ARC (Authenticated Received Chain)
* **The Problem:** When an email is automatically forwarded (e.g., through a mailing list or a university alumni address), the forwarding server often changes the email headers or body, which breaks SPF and DKIM. This causes legitimate forwarded emails to fail DMARC and get marked as spam.
* **The Solution:** ARC creates a "chain of custody." When the first server receives the email, it verifies SPF, DKIM, and DMARC, and mathematically seals those results in an ARC header. Subsequent servers down the line can see that the email *was* authentic when it started its journey, even if the forwarder broke the original signatures.

### BIMI (Brand Indicators for Message Identification)
* **What it does:** Displays a verified brand logo next to the email in the inbox.
* **How it relates to spoofing:** To use BIMI, a brand *must* have DMARC enforced at `quarantine` or `reject`. Therefore, if you see the official verified logo (like an Apple or Chase logo in Gmail), you know the email is highly authenticated and not spoofed.

## 3. Heuristics & Local Analysis Tools (Extension Context)

Even with DMARC, attackers find ways to trick users. Email clients and security extensions (like the `c2-email-spoofing-detector`) look at other indicators:

1. **Display Name Spoofing:** The attacker creates a free Gmail account but changes their "Display Name" to look official.
   * *Example:* `From: "PayPal Support" <randomhacker123@gmail.com>`
   * *Detection:* The tool checks if the display name implies a brand while the actual email address belongs to a freemail provider (Gmail, Yahoo, Outlook).
2. **Lookalike Domains (Cousin Domains/Homoglyphs):** The attacker registers a domain that looks identical to a real one.
   * *Example:* `netflix.com` vs `netfIix.com` (capital 'i' instead of 'l'), or using Cyrillic characters (`paypal.com` vs `pаypal.com`).
   * *Detection:* The tool uses Levenshtein distance (checking how closely the letters match known brands) and analyzes the characters for international alphabet mixing.
3. **Reply-To Mismatches:**
   * *Example:* `From: CEO@yourcompany.com` | `Reply-To: hacker@attacker.com`
   * *Detection:* If you hit reply, it goes to the attacker. A tool flags the email if the `From:` domain and `Reply-To:` domain completely mismatch without a valid reason.
4. **Header Routing Anomalies (`Received` chain):**
   * *Detection:* Analyzing the `Received:` headers to see the physical path the email took across the internet. If an email claiming to be from a US bank originated from a server in a known malicious IP block or unexpected country, it raises the spoofing risk score.