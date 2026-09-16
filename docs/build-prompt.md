# TARGET 2026-09-16

Appointment book. Days, slots, names. Open a day. Add a time and a
name. The book stays after a refresh. Copy the folder.

Prompt file (do not wait for a paste):
`C:\Users\aaron\OneDrive\Documents\prompts\multi-session-build-prompt.md`

Kind: week of days, open a day, write slots. Not a search. Not a
kanban. Not a bill split.

Local URL: http://127.0.0.1:49141/
Repo: https://github.com/Aaronlb912/appointments

Pages:
- `/` week strip, open a day, add and remove slots, book title,
  sample and blank, load and download JSON.
- `/demo/` opens the Elm Street Cuts sample (`?sample=1`).

Auth: none.

Sample: Elm Street Cuts in `site/public/sample.json`. Fake names.
Blank book in `site/public/book.json`.

## Session plan

- [x] Session 1: week of days, open a day, add a slot (time, name,
      phone, for), remove, persist, sample and blank, JSON in/out,
      miss on blank time or name.
- [ ] Session 2: edit a slot, Escape still clears the form, canceled
      pile, quiet Edit.
- [ ] Session 3: print the day, search a name, duplicate a week.
- [ ] Session 4: rename people on slots from a name list, old JSON
      still loads, empty and miss polish.
- [ ] Session 5: screenshots, demo video, README Demo, LinkedIn
      draft, SHIPPED.

## Usefulness check

1. Who else? A shop desk or a one-chair cutter who keeps a week of
   names on one tab. They finish "who is coming Tuesday."
2. Their data? Yes. Add and remove slots on the page. Load JSON.
   Edit is session 2.
3. Make it theirs? Yes. Title, shop name, place, note. CSS in
   `site/public/styles.css`.
4. Take it? Yes. Copy `site/public/`. Download JSON for the data.
5. No account? Yes. Static files. No signup.
6. Coworker test? Yes. Zip `site/public/`. They open `index.html` on
   any static server.
7. Keep a copy? Yes. Download JSON. Print the day is session 3.
8. Miss and recover? Yes. Blank time. Blank name. Then a filled
   slot. Bad JSON file shows a miss.
9. README says how? Session 1 has who, run, URL. Drop-in steps and
   Demo stills wait for the ship session.

## Go deep (done-means)

A person can finish the book on the page: add, open, edit, and
remove their own slots. Real fields (time, name, phone, for), not
only a title. Sample and blank. Persist and download. Find a name
later. Hit a miss and get back. Change title and CSS. Take the
folder. Escape cancels an editor. Empty days say what to do.
Quiet Edit/Remove. Old JSON still loads.

## This session

Session 1 landed. Week strip, open a day, add and remove a slot,
persist, sample, blank, JSON, miss.

## Next session

Edit a slot. Canceled pile (cancel, do not only delete). Quiet
Edit. Escape still clears the add form.

## SHIPPED means

Sessions 1-5 checked. Usefulness 1-9 all yes. README has copy the
folder, their data, three tool screenshots, and a github.com player
URL. Log marked SHIPPED. This product appended to
`C:\Users\aaron\OneDrive\Documents\prompts\multi-session-build-prompt.md`
under multi-session ships. No second product in this repo.
