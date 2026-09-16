import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The Privacy Policy page (public route `/privacy`, linked from the app-wide
 * footer). Static legal copy hand-authored as semantic HTML — numbered sections
 * are `<h2>` — rather than rendered from Markdown, matching the Terms of Service
 * and Help pages (see `terms-page.ts`, `help-page.ts`); a Markdown runtime
 * dependency wouldn't pay for itself for the app's static pages. Content is a
 * transcription of `docs/privacy-policy-draft.md`. Shares typography and section
 * dividers with the other legal pages via `legal-page.scss` (`legal-doc` class).
 *
 * Internal references to the Terms of Service and Help pages use `routerLink`,
 * not `href`, so they navigate in-app rather than triggering a full page reload.
 */
@Component({
  selector: 'app-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="legal-page legal-doc">
      <a class="legal-back" routerLink="/">← Back to Invoice-Gen</a>
      <h1>Privacy Policy — Invoice-Gen</h1>
      <p class="legal-meta"><strong>Last Updated:</strong> September 15, 2026</p>

      <hr />

      <p>
        This Privacy Policy explains what personal information Invoice-Gen
        collects, how it's used, who it's shared with, and the choices you have —
        for the same operating party named in our
        <a routerLink="/terms">Terms of Service</a>: Dmitrii Ivanovich Degtev, an
        Individual Entrepreneur registered in the Republic of Armenia ("Company,"
        "we," "us," "our").
      </p>

      <hr />

      <h2>1. Kinds of Personal Data</h2>
      <p>
        Invoice-Gen handles a few different categories of personal data, and it's
        worth being clear about the difference:
      </p>
      <p>
        <strong>Your account data</strong> — your email, password, and business
        profile (business name, address, logo, default currency). For this data,
        Invoice-Gen is the data controller: it's your information, and you can
        access, correct, or delete it directly through the app at any time.
      </p>
      <p>
        <strong>Data about your own customers</strong> — names, emails,
        addresses, phone numbers, and notes you save under the Customers feature,
        or enter directly onto a document (a "Bill To" name/address). This is
        information <em>you</em> collected about <em>your</em> customers for your
        own business purposes. For this data, you are the data controller, and
        Invoice-Gen processes it on your behalf as a service provider. If one of
        your customers wants to access, correct, or remove their information, they
        should contact you directly, not us — we don't have an independent
        relationship with them and generally can't verify who they are.
      </p>
      <p>
        <strong>Guest document data</strong> — Invoice-Gen lets a visitor
        generate a limited number of documents without creating an account. The
        names, addresses, and other details you type into that form are used only
        to render the PDF handed back to you; nothing about the document is stored
        on our servers before or after that response. Because there's no account,
        there's no ongoing controller relationship for this data the way there is
        for the two categories above — it exists only for the moment it takes to
        generate your PDF.
      </p>

      <h2>2. What We Collect</h2>
      <ul>
        <li>
          <strong>Account information</strong>: email address and password
          (stored as a secure hash, never in plain text).
        </li>
        <li>
          <strong>Business profile</strong>: business name, address, logo, and
          default currency, if you choose to fill these in.
        </li>
        <li>
          <strong>Customer records</strong>: name, email, address, phone, and
          private notes for any customer you save.
        </li>
        <li>
          <strong>Document data</strong>: everything you enter to create a
          document — line items, dates, amounts, tax/discount/shipping figures,
          notes, and terms.
        </li>
        <li>
          <strong>Guest document data</strong>: if you generate a document without
          an account, the same kind of information (recipient/sender names and
          addresses, line items, amounts) is used only to produce that one PDF and
          is not saved — see "Guest document data" above and Retention below.
        </li>
        <li>
          <strong>Technical information</strong>: standard web server logs (such
          as IP address, browser type, and request timestamps), collected
          automatically for security and operational purposes. For guest document
          generation specifically, your IP address is also used briefly to apply a
          rate limit that prevents abuse of that feature.
        </li>
        <li>
          <strong>Analytics information</strong>: when you visit the Service,
          Google Analytics collects information about that visit — such as the
          pages you viewed, how long you stayed, the general geographic region
          you're browsing from (derived from IP address, not your exact location),
          device and browser type, and how you arrived at the site (e.g., a search
          engine or a direct link). This is described further in "Analytics" below.
        </li>
      </ul>
      <p>
        We do not collect demographic information beyond what's described above,
        and we do not use cookies or any technology for advertising. We do use
        cookies for analytics, as described in "Analytics" below. Authentication
        itself does not use cookies — it uses your browser's local storage to hold
        a refresh token — see our <a routerLink="/terms">Terms of Service</a> and
        <a routerLink="/help">Help</a> pages for how this works.
      </p>

      <h3>Analytics</h3>
      <p>
        We use <strong>Google Analytics</strong>, provided by Google, to
        understand how visitors use the Service — for example, which pages are
        viewed and how many people visit. Google Analytics uses cookies and
        similar technology to do this. We have not enabled Google Signals or any
        feature that would use this data for advertising, and we do not combine
        Analytics data with your account information.
      </p>
      <p>
        If you'd rather not be included in this, you can install the
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener"
          >Google Analytics Opt-out Browser Add-on</a
        >, or use your browser's cookie/tracking-blocking settings. Google's own
        handling of this data is described in the
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener"
          >Google Privacy Policy</a
        >.
      </p>

      <h2>3. How We Use It</h2>
      <p>
        We use the information above to operate the Service: authenticating you,
        generating and storing your documents, pre-filling forms from your saved
        profile or customers, sending documents by email when you ask us to,
        calculating totals and payment status, generating a one-off document for a
        visitor who hasn't created an account yet, responding to support requests,
        and — via Google Analytics — understanding overall traffic and usage
        patterns so we can improve the Service. We do not use your data for
        advertising, and we do not build advertising profiles from it.
      </p>

      <h2>4. Sharing</h2>
      <p>
        We do not sell, rent, or share your personal information with third
        parties for their own marketing or advertising purposes.
      </p>
      <p>
        We do share information with service providers strictly as needed to
        operate the Service:
      </p>
      <ul>
        <li>
          <strong>Brevo</strong>, our email delivery provider, processes recipient
          email addresses and document content when you use the Send feature to
          email a document to a customer.
        </li>
        <li>
          <strong>Render</strong>, which hosts the backend application that powers
          the Service, in its Frankfurt, Germany (EU) data center region.
        </li>
        <li>
          <strong>Neon</strong>, which hosts our database — where your account,
          customer, and document data is stored — also in its Frankfurt, Germany
          (EU) data center region.
        </li>
        <li>
          <strong>Cloudflare</strong>, which delivers the Invoice-Gen web
          application (the pages and code your browser loads) through its global
          content delivery network. This step only serves the application's static
          files, not your account, customer, or document data — that data is
          stored solely on Render and Neon as described above — but because
          Cloudflare's network has locations worldwide, loading the app may briefly
          pass through infrastructure outside the EU/EEA depending on where you're
          located.
        </li>
        <li>
          <strong>Google</strong>, which provides Google Analytics as described in
          "Analytics" above. Google processes this data on infrastructure located
          outside the EU/EEA (including the United States); Google represents that
          it does so under the EU Standard Contractual Clauses and its own
          compliance frameworks — see the
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener"
            >Google Privacy Policy</a
          >
          for details.
        </li>
      </ul>
      <p>
        We may also disclose personal information if required by law — for example,
        in response to a valid legal request — or if we believe in good faith that
        disclosure is necessary to protect our rights, investigate fraud, or
        protect the safety of our users or others.
      </p>
      <p>
        If Invoice-Gen is ever involved in a merger, acquisition, or sale of its
        business, we'll notify you (by email or a notice on this site) of any
        resulting change in ownership or how your information is handled.
      </p>
      <p class="legal-note">
        <strong>Note:</strong> Your account, customer, and document data is stored
        on EU-based infrastructure (Render and Neon, both in Frankfurt, Germany).
        Brevo processes email content only when you use the Send feature.
        Cloudflare's global network is involved solely in delivering the
        application's static files to your browser, not in storing your data. If
        you're in the EU/EEA, this may still warrant additional disclosures about
        international data transfer safeguards, depending on where each provider's
        own subprocessors and infrastructure are located — worth confirming
        against each provider's current data processing terms and, ideally, a
        lawyer's review before this is treated as final.
      </p>

      <h2>5. Security</h2>
      <p>
        We take reasonable technical and administrative measures to protect your
        information, including encrypting data in transit and storing passwords as
        secure hashes rather than plain text. No online service can guarantee
        absolute security, and we can't promise the Service will never be
        compromised — see the Disclaimer of Warranties in our
        <a routerLink="/terms">Terms of Service</a>.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep your data for as long as your account is active. Individual
        documents and customers you delete are retained in a recoverable,
        non-visible state rather than being immediately erased (so accidental
        deletions can be investigated if needed), consistent with how the app
        already handles deletion elsewhere. If you delete your entire account, all
        of your data — account, profile, documents, and customers — is deleted
        immediately and permanently; this cannot be undone. See the Term and
        Termination section of our <a routerLink="/terms">Terms of Service</a>.
      </p>
      <p>
        Guest (no-account) document generation is not retained at all: the
        information you submit and the PDF we generate from it exist only to
        produce that one response and are discarded immediately afterward. We keep
        no copy — downloading the PDF when it's offered to you is the only way to
        keep it. Your IP address, used briefly for the rate limit described in
        "What We Collect," is not retained beyond what's needed to enforce that
        limit.
      </p>
      <p>
        Analytics data collected by Google Analytics is retained according to
        Google's own retention settings for this property (by default, 14 months
        from collection, after which it is automatically deleted), rather than our
        own account-based retention rules described above.
      </p>

      <h2>7. Your Rights and Choices</h2>
      <p>
        For your own account data, you can access and correct it anytime by
        logging in and editing your Profile. You can delete individual documents or
        customers from within the app, or delete your entire account and all
        associated data from your Profile page. If you'd rather contact us directly
        instead of using these self-service tools, reach us at the contact below.
      </p>
      <p>
        If you used the guest (no-account) document generation feature, there is
        nothing stored on our end to access, correct, or delete — as described in
        Retention above, nothing from that request is kept past the moment your PDF
        is generated.
      </p>
      <p>
        We don't currently send marketing emails or newsletters — the only emails
        Invoice-Gen sends are transactional (such as a document you've asked us to
        send to a customer), so there's no marketing communication to opt out of
        today.
      </p>

      <h2>8. Children's Privacy</h2>
      <p>
        Invoice-Gen is not directed at, and we do not knowingly collect personal
        information from, children. If you believe a child has provided us with
        personal information, contact us and we will delete it.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will
        be reflected by updating the "Last Updated" date above; continued use of
        the Service after a change constitutes acceptance of the updated policy.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this Privacy Policy, or requests regarding your personal
        data, can be sent to
        <a href="mailto:dimatega@gmail.com">dimatega&#64;gmail.com</a>.
      </p>
    </main>
  `,
  styleUrl: './legal-page.scss',
})
export class PrivacyPage {}
