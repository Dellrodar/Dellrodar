---
layout: page
title: "Enhancement Two: Algorithms and Data Structures"
permalink: /enhancement-two/
---

## The Artifact

The artifact is the animal shelter dashboard originally built in CS 340: Client/Server
Development during the January–March 2026 term. In the original application,
rescue-profile filtering relied on hard-coded criteria baked into the dashboard logic.

[View the original artifact](https://github.com/Dellrodar/Dellrodar/tree/main/grazioso_animal_shelter_dashboard)

## What Was Enhanced

I replaced the hard-coded filtering with a database-driven matching algorithm:

- **Rescue profile criteria stored in the database**: preferred breeds with weights,
  age ranges, sex preferences, and availability requirements live in rescue profile
  tables instead of application code
- **Flexible breed matching with PostgreSQL `pg_trgm`**: trigram similarity handles
  the mixed breeds, abbreviations, and inconsistent breed descriptions common in real
  shelter data, where exact string matching fails
- **Match scoring and ranking**: each candidate animal is scored on breed similarity,
  age fit, sex, and availability, then results are sorted by score
- **Pagination**: ranked results are paginated so the dashboard stays responsive as
  the dataset grows

## Why This Improves the Artifact

Exact filtering silently drops good candidates: a profile looking for a Labrador
Retriever should still surface a "Labrador Retriever Mix." Similarity scoring keeps
those candidates and ranks them honestly. Moving the criteria into the database also
means new rescue profiles can be added without changing application code. The
algorithm and its inputs are finally separate concerns.

## Trade-Offs Considered

The main design decisions were between exact filtering and flexible similarity scoring,
and between computing matches in application code versus in the database. I chose
database-supported similarity matching because `pg_trgm` with a trigram index performs
the fuzzy comparison where the data lives, avoiding the cost of pulling every record
into the application to score it.

## Course Outcomes Demonstrated

- **Computing solutions and trade-offs**: algorithmic thinking through scoring,
  ranking, filtering, and pagination, with explicit trade-off decisions
- **Tools, techniques, and value**: the matching feature makes rescue-profile searches
  practical for non-technical users

This enhancement most directly demonstrates outcomes three and four. Outcomes one and two
are demonstrated more strongly through collaboration, communication, and documentation
elsewhere in the portfolio. Security was considered in the authenticated search workflow,
but outcome five was not the primary focus of this enhancement.

## Reflection

This enhancement was where I did the most deliberate evaluation of design alternatives.
The hardest decisions were choosing between exact filtering and flexible similarity
scoring, and between computing matches in application code versus in the database.
Working through those trade-offs taught me to justify algorithmic choices in terms of
performance and real data rather than convenience. Database-side scoring, deterministic
ranking, and bounded pagination all came out of that analysis. This was also where I
applied the process feedback from my first enhancement: instead of uploading everything
at once, I completed the work through seven focused commits that separately show the
animal data model, authenticated search, rescue profiles, the matching algorithm, the
frontend search interface, ranked results, tests, and documentation. That structure made
the development process itself reviewable, not just the result.

**Reviewer access:** create a free account from the sign-up link on the live app to explore it with the viewer role.

**Artifact links:** [Live application](https://dellrodar.vercel.app) &middot;
[Repository](https://github.com/Dellrodar/Dellrodar) &middot;
[Enhancement branch](https://github.com/Dellrodar/Dellrodar/tree/enhancement-two)
