---
layout: page
title: Code Review
permalink: /code-review/
---

Before beginning the enhancements, I recorded a code review of the original CS 340
animal shelter dashboard. The review walks through the existing functionality, analyzes
the code for areas of improvement, and explains the enhancements planned across all
three categories: software design and engineering, algorithms and data structures, and
databases.

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe
    src="https://www.youtube.com/embed/pd7dArJnuQQ"
    title="CS 499 Code Review"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</div>

## What the Review Covers

- **Existing functionality**: the original Python Dash dashboard that filtered animal
  records for rescue-profile candidates, with breed visualizations and location data.
- **Code analysis**: tightly coupled logic, hard-coded rescue criteria, limited
  validation, and the absence of authentication or role-based access.
- **Planned enhancements**: the full-stack modernization, the database-driven matching
  algorithm with trigram breed similarity, and the normalized PostgreSQL schema.
