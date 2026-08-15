---
layout: page
title: "Enhancement One: Software Design and Engineering"
permalink: /enhancement-one/
---

## The Artifact

The artifact is the animal shelter dashboard originally built in CS 340: Client/Server
Development during the January–March 2026 term. The original application was a Python
Dash dashboard that helped Grazioso Salvare identify dogs suitable for rescue training
by filtering animal records and displaying breed visualizations and location data.

[View the original artifact](https://github.com/Dellrodar/Dellrodar/tree/main/grazioso_animal_shelter_dashboard)

## What Was Enhanced

I restructured the original application into a full-stack monorepo with clearly
separated concerns:

- A **FastAPI backend** exposing REST API endpoints with request validation and
  consistent responses
- A **React frontend** built from reusable components with role-based navigation
- **Separated service and data-access layers** so business logic is independent of both
  the web framework and the database
- **Authentication and role-based authorization** with viewer, staff, and admin roles.
  New accounts default to viewer, and staff permissions require admin approval
- **Security throughout**: password hashing, backend validation of all submitted data,
  restricted staff and admin routes, safe error handling, and archive behavior instead
  of hard deletion
- **Documentation**: README and architecture notes describing the system for future
  maintainers

## Why This Improves the Artifact

The original dashboard mixed data access, filtering logic, and presentation in one
place, which made it difficult to test or extend. The enhanced structure reduces
coupling, makes each layer independently testable, and turns a single-purpose script
into an application that can grow. Adding an endpoint, a page, or a role no longer
means touching everything at once.

## Course Outcomes Demonstrated

- **Computing solutions and trade-offs**: choosing a layered architecture and weighing
  framework, structure, and scope decisions against a six-week timeline
- **Tools, techniques, and value**: FastAPI, React, and structured refactoring applied
  to deliver a more maintainable and useful application
- **Security mindset**: defense-in-depth through authentication, authorization,
  validation, and safe error handling

This enhancement most directly demonstrates outcomes three, four, and five. Outcomes one
and two are demonstrated more strongly through the broader portfolio, including the code
review, technical documentation, and professional self-assessment, rather than through
this enhancement alone.

## Reflection

This enhancement changed how I think about software engineering. When I entered the
program I viewed the field mainly as writing functional code, but restructuring this
application forced me to treat architecture, security, testing, and documentation as
parts of one system. The frontend, backend, authorization controls, and database all
have to operate together, and a design decision in one layer shows up everywhere else.
The biggest challenge was reshaping a tightly coupled dashboard into separated layers
while keeping the application working at every step. The most valuable feedback was
about process rather than code: I delivered this first enhancement as one large upload,
and instructor feedback made clear how much harder that made the work to review. That
lesson directly shaped the later enhancements, which I built in small, focused commits
that each document what changed and why.

**Reviewer access:** create a free account from the sign-up link on the live app to explore it with the viewer role.

**Artifact links:** [Live application](https://dellrodar.vercel.app) &middot;
[Repository](https://github.com/Dellrodar/Dellrodar) &middot;
[Enhancement branch](https://github.com/Dellrodar/Dellrodar/tree/enhancement-one)
