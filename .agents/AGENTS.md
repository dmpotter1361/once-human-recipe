# OnceHuman Recipe Project Rules & Memory

This directory is the workspace for the OnceHuman Recipe project. It contains the crafting formulas and recipe data parsed from Google Sheets.

## Memory & Context

- **Source Spreadsheet:** [Once Human Crafting Formulas (Google Sheets)](https://docs.google.com/spreadsheets/d/1EdV5RekBIv9EaTtfc3lNPHfadZVBcGMWcsUqz1krEjI/edit?usp=sharing)
- **CSV Location:** [once_human_crafting_formulas.csv](file:///C:/Users/micha/Projects/OnceHuman%20Recipe/once_human_crafting_formulas.csv)
- **Data Columns:**
  - `Item`: The name of the crafted item or recipe.
  - `Formula`: The materials and components required for crafting.
  - `Category`: The type of item (e.g., Survival, Combat, Production, Exclusive, Build).
  - `Reverse Engineering Points`: Points associated with reverse-engineering the item, if applicable.
  - `Acquired by`: Where or how to obtain the recipe/item.

---

## Instructions & Custom Rules

### 1. Downloading/Updating the CSV
- Direct downloads via the standard export URL (`/export?format=csv`) fail with a `401 Unauthorized` error because Google requires OAuth for private/restricted access.
- To update the CSV programmatically without authentication, use the Google Visualization API endpoint:
  ```
  https://docs.google.com/spreadsheets/d/1EdV5RekBIv9EaTtfc3lNPHfadZVBcGMWcsUqz1krEjI/gviz/tq?tqx=out:csv
  ```
- Example Python download snippet:
  ```python
  import urllib.request
  url = "https://docs.google.com/spreadsheets/d/1EdV5RekBIv9EaTtfc3lNPHfadZVBcGMWcsUqz1krEjI/gviz/tq?tqx=out:csv"
  req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
  with urllib.request.urlopen(req) as response:
      content = response.read()
  with open("once_human_crafting_formulas.csv", "wb") as f:
      f.write(content)
  ```

### 2. File Integrity
- Do not modify `once_human_crafting_formulas.csv` manually unless updating or cleaning up data.
- Ensure the header row (`Item`, `Formula`, `Category`, `Reverse Engineering Points`, `Acquired by`) remains intact when parsing or generating derived files.
