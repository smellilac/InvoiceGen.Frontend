import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The Help page (public route `/help`, linked from the app-wide footer). Static
 * product copy hand-authored as semantic HTML — top-level sections are `<h2>`,
 * subsections `<h3>` — rather than rendered from Markdown, matching the Terms of
 * Service page (see `terms-page.ts`). Shares typography and the section dividers
 * with the other legal pages via `legal-page.scss` (`legal-doc` class).
 */
@Component({
  selector: 'app-help-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="legal-page legal-doc">
      <a class="legal-back" routerLink="/">← Back to Invoice-Gen</a>
      <h1>Help</h1>

      <hr />

      <p>
        Invoice-Gen lets you create professional invoices, receipts, quotes, and
        nine other types of billing documents, then download them as a PDF or
        send them straight to a customer by email.
      </p>

      <hr />

      <h2>Why use Invoice-Gen?</h2>
      <p>
        <strong>One tool, twelve document types.</strong> Invoices, receipts,
        credit notes, quotes, estimates, proforma invoices, purchase orders,
        sales orders, statements, timesheets, work orders, and packing slips —
        pick the type you need from one place instead of hunting for a different
        template each time.
      </p>
      <p>
        <strong>Your documents, saved and searchable.</strong> Every document you
        create is stored in your account and shows up in your document history,
        filterable by type or by customer, so you can find something you made
        months ago without digging through downloaded files.
      </p>
      <p>
        <strong>Save your customers once, bill them anytime.</strong> Store a
        customer's name, email, address, and phone under Customers, then pick them
        from a list when creating a document instead of retyping their details
        each time — and see every document you've created for them in one place.
      </p>
      <p>
        <strong>Send documents by email, not just download them.</strong> Beyond
        generating a PDF, you can email a document directly to a customer from
        inside the app.
      </p>
      <p>
        <strong>Business details and logo, filled in once.</strong> Save your
        business name, address, and logo under Profile, and reuse them across
        every document instead of typing the same information or re-uploading your
        logo each time you create something new.
      </p>
      <p>
        <strong>Free.</strong> Invoice-Gen currently has no paid plans or usage
        limits.
      </p>

      <h2>How do I use Invoice-Gen?</h2>

      <h3>Creating a document</h3>
      <p>
        From the main screen after logging in, pick the type of document you want
        to create. Fill out the form — who it's to and from, line items with
        quantity and unit cost, tax/discount/shipping if they apply, dates, notes,
        and terms. The totals are calculated for you as you go. When you're ready,
        submit the form to create the document.
      </p>

      <h3>Downloading a document</h3>
      <p>
        Open any document from your history to see its detail page, where you'll
        find a "Download PDF" option. The PDF reflects exactly what you entered on
        the form.
      </p>

      <h3>Sending a document by email</h3>
      <p>
        From a document's detail page, use the Send option to email it to a
        customer. You'll be asked for the recipient's email (pre-filled
        automatically if the document is linked to a saved customer) and can
        include an optional message. Sending is asynchronous — after you send it,
        the document's status will update to reflect whether delivery succeeded,
        rather than confirming instantly.
      </p>

      <h3>Editing a document</h3>
      <p>
        Documents can't be modified in place once created — this is deliberate,
        since a document you've already sent or downloaded is meant to be a stable
        record. Instead, use the Edit option on a document's detail page: it opens
        a new document form pre-filled with everything from the original, lets you
        make your changes, and creates a corrected copy when you submit,
        automatically replacing the original.
      </p>

      <h3>Customers</h3>
      <p>
        Save a customer's name, email, address, phone, and any private notes under
        Customers, so you don't have to retype their details every time you bill
        them. When creating a document, you can select a saved customer to
        automatically fill in the "Bill To" details. From a customer's own page,
        you can jump straight into creating a new document for them, and see every
        document you've created for that customer in one place.
      </p>

      <h3>Your business profile</h3>
      <p>
        Under Profile, save your business name, address, default currency, and a
        logo once. Your logo can optionally be included on individual documents —
        each document has its own toggle, so you can decide per-document whether to
        include it, and changing your logo later won't alter documents you already
        created.
      </p>

      <h3>Tracking payments</h3>
      <p>
        If a document has an amount still outstanding, its detail page lets you
        record a payment against it. The remaining balance updates immediately,
        and a document with a passed due date and an unpaid balance is flagged as
        overdue in your document list so it doesn't get lost.
      </p>

      <h3>Your account</h3>
      <p>
        Invoice-Gen requires an account so your documents and customers stay
        attached to you and nobody else. You can delete your account and all
        associated data at any time from your Profile page — this is immediate and
        permanent.
      </p>

      <h2>Where is my data stored?</h2>
      <p>
        Everything you create in Invoice-Gen — documents, customers, your profile
        — is stored securely on our servers, tied to your account. This is
        different from tools that rely on your browser's local storage: clearing
        your browser history or switching devices won't affect your data, since it
        isn't stored on your device at all. You can access your full document
        history by logging in from any device.
      </p>

      <h2>Questions?</h2>
      <p>
        If something isn't working as expected or you have a question we haven't
        covered here, reach out — see the Contact link in the footer.
      </p>
    </main>
  `,
  styleUrl: './legal-page.scss',
})
export class HelpPage {}
