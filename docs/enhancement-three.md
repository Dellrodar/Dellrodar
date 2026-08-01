---
layout: page
title: "Enhancement Three: Databases"
permalink: /enhancement-three/
---

## The Artifact

The artifact is the animal shelter dashboard originally built in CS 340. The original
application read shelter records from a loosely structured data source with no schema
enforcement, no user accounts, and rescue criteria hard-coded in the application.

## What Was Enhanced

I migrated the data layer to PostgreSQL with a normalized relational schema:

- **Normalized animal storage** — animal records reference lookup tables for breed,
  type, sex, and outcome type instead of repeating free-text values
- **User and role tables** — supporting authentication and role-based authorization for
  viewer, staff, and admin users
- **Rescue profile tables** — profile criteria and breed-weight associations stored
  relationally, feeding the matching algorithm
- **Migrations** — schema changes applied through versioned migrations rather than
  manual setup
- **Constraints and indexes** — foreign keys, integrity constraints, and a trigram
  index supporting the similarity-based breed matching
- **Seed and import scripts** — repeatable loading of shelter data and default accounts
- **Dashboard data support** — a breed summary endpoint backing the dashboard's breed
  distribution chart and location map

## Why This Improves the Artifact

The normalized schema turns implicit conventions into enforced rules: an animal cannot
reference a breed that does not exist, and lookup values stay consistent across the
dataset. That reliability is what makes the similarity matching, the dashboard
visualizations, and future expansion possible. Some fields — such as color, outcome
subtype, and profile breed text — deliberately remain text where normalization would
add cost without adding integrity, which was itself a documented design decision.

## Course Outcomes Demonstrated

- **Computing solutions and trade-offs** — deciding which fields to normalize and which
  to leave as text, and where indexes pay for themselves
- **Tools, techniques, and value** — PostgreSQL, migrations, and the `pg_trgm`
  extension applied to create a structured, reliable data model
- **Security mindset** — account data stored with hashed passwords, role data enforced
  at the database level, and archive behavior preserving audit history

## Reflection

[TODO: Add your personal reflection — what you learned, what challenged you, and what
feedback shaped the work.]

**Artifact links:** [Repository](https://github.com/Dellrodar/Dellrodar) &middot;
[Enhancement branch](https://github.com/Dellrodar/Dellrodar/tree/enhancement-three)
