# CS 499 Enhancement Plan

## Artifact Overview

The artifact selected for enhancement is the CS 340 animal shelter dashboard. The original application was built as a Flask-based dashboard that helped users identify animal candidates for specific rescue profiles. It provided filtered animal records, breed visualizations, and location data to support the original mission of helping Grazioso Salvare identify dogs that may be suitable for rescue training.

The planned enhancement will modernize the original dashboard into a scoped full-stack application using a FastAPI backend, PostgreSQL database, and React frontend. The goal is not to replace the original purpose of the application, but to improve its architecture, data model, search capability, security, and maintainability while staying aligned with the original rescue-profile workflow.

This artifact will be enhanced across the three required CS 499 categories:

- Software Design and Engineering
- Algorithms and Data Structures
- Databases

## Enhancement Summary

The enhanced application will allow authenticated users to view animal records, search shelter data, select rescue profiles, and review ranked animal candidates. Staff and admin users will have additional role-based access to manage animal records and user accounts.

The primary improvement is a full-stack modernization that separates frontend, backend, database, and documentation concerns. The rescue-profile search will also be improved by using PostgreSQL `pg_trgm` similarity matching to support flexible breed matching when animal breed values are inconsistent, mixed, or not exact matches.

## Enhancement Categories

### Software Design and Engineering

The software design and engineering enhancement will restructure the original application into a full-stack monorepo. The frontend, backend, database configuration, and documentation will be separated into clear project areas.

Planned improvements include:

- FastAPI backend for REST API endpoints
- React frontend with reusable components
- Separated service and data-access logic
- Role-based navigation and UI behavior
- Authentication and authorization support
- Clear README and architecture documentation
- Improved code organization and maintainability

This enhancement improves the original artifact by reducing tightly coupled logic and making the application easier to test, extend, and maintain.

### Algorithms and Data Structures

The algorithm enhancement will improve the original rescue-profile filtering workflow. Instead of relying only on basic filtering or hard-coded logic, the enhanced application will retrieve rescue profile criteria from the database and use those criteria to score and rank candidate animals.

The matching process will use:

- Rescue profile criteria
- Flexible breed similarity matching through PostgreSQL `pg_trgm`
- Age range matching
- Sex matching
- Availability or outcome status
- Match scoring
- Sorting and pagination

This keeps the application aligned with the original mission while making the matching process more flexible and maintainable. The use of `pg_trgm` is especially useful because shelter breed data may contain mixed breeds, abbreviations, or inconsistent breed descriptions.

### Databases

The database enhancement will migrate the data layer to PostgreSQL and use a normalized schema. The database will separate animal records from lookup data such as breed, type, sex, and outcome status. It will also include user and role tables to support authentication and role-based authorization.

Planned database improvements include:

- Normalized relational schema
- Animal lookup tables
- User and role tables
- Rescue profile tables
- Breed-weight associations for rescue profiles
- PostgreSQL migrations
- Constraints and indexes
- Seed/import scripts
- `pg_trgm` extension for similarity matching

This enhancement improves the original artifact by creating a more structured and reliable data model that supports validation, query efficiency, and future expansion.

## Planned Application Architecture

```text
React Frontend
    ↓
FastAPI Backend
    ↓
Service Layer
    ↓
Data Access Layer
    ↓
PostgreSQL Database
```

The frontend will handle user interaction, dashboard views, search controls, and role-based navigation. The backend will validate requests, enforce authorization, apply business logic, and return consistent API responses. PostgreSQL will store animal records, rescue profile criteria, user accounts, roles, and lookup values.

## Planned Data Model

At a high level, the enhanced schema will include the following tables:

```text
animals
animal_breeds
animal_types
animal_sexes
outcome_types
users
roles
rescue_profiles
rescue_profile_breeds
```

The animal tables support normalized shelter record storage. The user and role tables support authentication and authorization. The rescue profile tables support the matching algorithm by storing rescue criteria and breed-weight relationships in the database instead of hard-coding those rules in the application logic.

## Role-Based Access Model

The application will use role-based access control to limit functionality based on user responsibility.

### Viewer

- View dashboard
- Search animals
- View ranked rescue-profile results
- View animal details

### Staff

- All viewer permissions
- Add animal records
- Update animal records
- Archive animal records if allowed

### Admin

- All staff permissions
- Access admin panel
- Manage user accounts
- Change user roles
- Disable or remove user accounts

This supports a defense-in-depth approach because users are not granted elevated access simply because they are authenticated. The backend will check both authentication and authorization before allowing restricted actions.

## Planned Flows

### Signup Flow

```text
User opens login page
User selects signup
System displays signup form
User enters required account information
System validates required fields
System validates password requirements
System checks whether email already exists
System assigns default role of viewer
System hashes password
System stores user record
System confirms account creation
User is prompted to sign in
```

### Authentication Flow

```text
User opens login page
User enters credentials
System validates required fields
System checks whether the account exists
System rejects invalid login attempts
System checks whether the account is active
System verifies password against stored password hash
System loads user role
System creates authenticated session
System routes user based on role
Viewer is sent to dashboard
Staff is sent to dashboard with staff actions enabled
Admin is sent to dashboard with admin actions enabled
```

### Authorization Flow

```text
User requests an action
System checks whether user is authenticated
System checks user role
System compares role against required permission
If role is allowed, request continues
If role is not allowed, request is denied
System returns appropriate response
System logs restricted or administrative actions when needed
```

### Admin Role Flow

```text
Admin accounts are seeded by default
Admin logs in through standard authentication flow
System loads admin role
Admin accesses admin panel
Admin views user account list
Admin can change user roles
Admin can disable or remove user accounts
Admin can access animal management tools
Admin can add, update, or archive animal records
System logs admin account and animal-management changes
```

### Staff Role Flow

```text
Staff account is promoted by admin
Staff logs in through standard authentication flow
System loads staff role
Staff sees animal management options
Staff can add new animal records
Staff can update existing animal records
Staff can archive animal records if permitted
Staff cannot manage users or change roles
```

### General Animal Search Flow

```text
User opens dashboard
User enters search terms or filter options
System validates search request
System searches animal records by supported fields such as name, breed, type, or animal ID
System returns matching records
Frontend displays results in the dashboard table
User can select a record to view more details
```

### Rescue Profile Search Flow

```text
User opens dashboard
User selects rescue profile
User optionally adds filters
System validates search request
System retrieves rescue profile criteria
System compares animal records against profile criteria
System uses pg_trgm similarity for flexible breed matching
System applies additional criteria such as age, sex, and availability
System calculates match score
System ranks results by score
System returns paginated results
Frontend displays ranked table, breed chart, and location map
```

### Add Animal Flow

```text
Staff selects Add Animal from navigation
System opens animal form
Staff enters animal details
System validates required fields
System validates lookup values such as breed, type, sex, and outcome
Staff submits form
System saves animal record
System confirms successful creation
Animal is added to the database and is now searchable
```

### Update Animal Records Through Search Page

```text
Staff searches for animal
System returns matching records
Edit icon is available for staff users
Staff selects edit icon
System loads existing animal information into edit form
Staff updates information
System validates updated data
Staff submits update
System saves updated record
System confirms successful update
Updated animal information appears in future searches
```

### Update Animal Records Through Management Page

```text
Staff opens animal management page
Staff uses typeahead search to find animal record
Staff selects animal record
System loads existing animal information into update form
Staff updates information
System validates updated data
Staff submits update
System saves updated record
System confirms successful update
Updated animal information appears in future searches
```

### Archive Animal Record Flow

```text
Staff or admin searches for animal
System returns matching records
User selects archive option
System asks for confirmation
User confirms archive action
System marks animal as archived
Archived animal is removed from default search results
Archived animal remains available for audit or historical reference
```

## Rescue Profile Matching Pseudocode

```text
FUNCTION searchByRescueProfile(profileId, filters, page, pageSize):

    Validate search request

    profile = Load rescue profile criteria

    candidates = Find animals that match basic filters

    scoredResults = Empty list

    FOR each animal IN candidates:

        score = 0

        breedScore = Compare animal breed to profile preferred breeds
        score = score + breedScore

        IF animal age fits profile age range:
            score = score + age score

        IF animal sex fits profile preference:
            score = score + sex score

        IF animal is available or eligible:
            score = score + availability score

        Add animal and score to scoredResults

    Sort scoredResults by highest score

    Paginate scoredResults

    Return ranked results
```

## Security Plan

The security enhancement will apply defense-in-depth across the application rather than treating security as a single feature.

Planned security improvements include:

- Password hashing
- Default viewer role for new users
- Role-based authorization
- Admin approval before staff permissions are granted
- Backend validation for all submitted data
- Restricted staff and admin routes
- Safe error handling
- Environment-based configuration
- Account status checks
- Logging for restricted or administrative actions
- Archive behavior instead of hard deletion for animal records

These improvements reduce unnecessary access, protect account data, and make administrative changes easier to trace.

## Six-Week Implementation Plan

### Week 1: Code Review and Planning

- Review original artifact
- Record code review video
- Finalize enhancement plan
- Finalize UML and data model
- Identify scope boundaries

### Week 2: Software Design Foundation

- Create monorepo structure
- Scaffold FastAPI backend
- Scaffold React frontend
- Define API routes at a high level
- Add initial README and architecture notes

### Week 3: Authentication and Role-Based Access

- Add signup and login flows
- Add user and role model support
- Seed admin account
- Add role-based navigation behavior
- Add backend authorization checks

### Week 4: Database Enhancement

- Implement PostgreSQL schema
- Add migrations
- Add lookup tables
- Add seed/import scripts
- Add rescue profile tables
- Add `pg_trgm` support for similarity matching

### Week 5: Algorithm Enhancement

- Implement rescue profile search flow
- Add similarity-based breed matching
- Add scoring and ranking logic
- Add pagination
- Display ranked results in frontend
- Preserve dashboard table, chart, and map purpose

### Week 6: Testing, Documentation, and Portfolio Polish

- Add validation and error-handling improvements
- Test key user flows
- Review security decisions
- Finalize narratives
- Finalize README documentation
- Prepare ePortfolio materials

## Scope Boundaries

The goal is a polished vertical slice, not a full enterprise shelter management platform. The most important features are authentication, role-based access, animal search, rescue-profile matching, database normalization, and dashboard display.

Features that may be deferred if time becomes limited include:

- Google SSO
- Automated staff-domain approval
- Full deployment automation

## Stretch Enhancements

### Google SSO

```text
Add Google SSO as an alternate authentication method
Match SSO email to existing user account when applicable
Assign new SSO users the default viewer role
```

### Staff Domain Recognition

```text
Recognize possible staff accounts from approved email domains
Flag those accounts for admin review
Require admin approval before granting staff permissions
```

## Course Outcome Alignment

### Outcome 1: Collaborative Environments and Decision-Making

The enhancement plan supports decision-making by providing clear documentation, role definitions, technical flows, and architecture notes. These materials make the system easier for developers, reviewers, stakeholders, and future maintainers to understand.

### Outcome 2: Professional Communication

The project will include a code review video, README updates, architecture documentation, comments, and enhancement narratives. These materials explain what changed, why it changed, and how the enhancements improve the artifact.

### Outcome 3: Computing Solutions and Trade-Offs

The rescue-profile matching feature demonstrates algorithmic thinking through scoring, ranking, filtering, pagination, and similarity matching. The project also includes design trade-offs between exact filtering and flexible similarity scoring, as well as between application-side logic and database-supported matching.

### Outcome 4: Tools, Techniques, and Value

The enhancement uses FastAPI, React, PostgreSQL, role-based access, migrations, and structured refactoring to create a more maintainable and useful application. The work delivers practical value by making rescue-profile searches easier for non-technical users.

### Outcome 5: Security Mindset

The enhancement includes password hashing, role-based access control, validation, account status checks, restricted routes, safe error handling, and audit-friendly archive behavior. These decisions reduce unauthorized access and improve the security and reliability of the system.
