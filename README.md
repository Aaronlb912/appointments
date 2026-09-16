# Appointment book

Open a day. Write a name and a time. Switch week or month. Jump back
to this week. Edit or cancel a slot. Search a name. Print the day.
Duplicate a week. Rename a person. The book stays in this browser
after a refresh.

This is a desk book for a shop that already knows who is coming this
week. It is not a calendar product and it does not send mail.

## Who it is for

A one-chair cutter, a small shop desk, anyone who used to keep names
in a paper week. Put your people on the days, then leave the tab open.

## Run it

From this folder:

```
npm start
```

Then open http://127.0.0.1:49141/

Click **Load sample** for Elm Street Cuts (fake names). **Start blank**
if you want your own week. The sample is also at
http://127.0.0.1:49141/demo/

## What is in the folder

The tool is the files in `site/public/`.

- `index.html` - the page
- `styles.css` - cloth-and-paper look
- `app.js` - days, slots, persist, JSON
- `book.json` - starts blank
- `sample.json` - Elm Street Cuts, week of September 14, 2026
- `demo/index.html` - opens the sample

No account.

## Make it yours

On the page, **This book** changes the title, shop name, place, and
note. **Rename a person** changes that name on every slot. CSS is
`site/public/styles.css` if you want a different cover.
