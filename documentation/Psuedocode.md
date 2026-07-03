# Flows
## Signup flow
- User opens login page
- User selects signup
- System displays signup form
- User enters required account information
- System validates required fields
- System checks whether email already exists
- System assigns default role of viewer
- System hashes password
- System stores user record
- System confirms account creation
- User is prompted to sign in

## Authentication Flow
- User opens login page
- User enters credentials
- System validates credentials
- System rejects invalid login attempts
- System loads user role
- System creates authenticated session
- System routes user based on role
- Viewer is sent to dashboard
- Staff is sent to dashboard with staff actions enabled
- Admin is sent to dashboard with admin actions enabled

## Authorization Flow
- User requests an action
- System checks whether user is authenticated
- System checks user role
- System compares role against required permission
- If role is allowed, request continues
- If role is not allowed, request is denied
- System logs or returns appropriate response

## Admin Role Flow
- Admin accounts are seeded by default
- Admin logs in through standard authentication flow
- System loads admin role
- Admin accesses admin panel
- Admin views user account list
- Admin can change user roles
- Admin can disable or remove user accounts
- Admin can access animal management tools
- Admin can add, update, or archive animal records

## Staff Role Flow
- Staff account is promoted by admin
- Staff logs in through standard authentication flow
- System loads staff role
- Staff sees animal management options
- Staff can add new animal records
- Staff can update existing animal records
- Staff can archive records if permitted
- Staff cannot manage users or change roles

## General Animal Search Flow
- User opens dashboard
- User enters search terms or filter options
- System validates search request
- System searches animal records by supported fields such as name, breed, type, or animal ID
- System returns matching records
- Frontend displays results in the dashboard table
- User can select a record to view more details

## Rescue Profile Search Flow
- User opens dashboard
- User selects rescue profile
- User optionally adds filters
- System validates search request
- System retrieves rescue profile criteria
- System compares animal records against profile criteria
- System uses pg_trgm similarity for flexible breed matching
- System applies additional criteria such as age, sex, and availability
- System calculates match score
- System ranks results by score
- System returns paginated results
- Frontend displays ranked table, breed chart, and location map

## Staff Animal Management Flow
### Add Animal
- Staff has an additional option on the navigation for adding an animal
- Aniaml form is opened for recording details about the animal
- System validates required fields
- System validates lookup values such as breed, type, sex, and outcome
- Staff submits form
- System saves animal record
- System confirms successful creation
- Animal is added to the database and is now searchable

### Update Animal records
#### Via search page
- Staff searches for animal
- System returns matching records
- An pencil or update icon is available for Staff to click on
- When clicked, information is loaded to a seperate edit page where all fields are avaliable
- Staff updates information
- System validates updated data
- Staff clicks update
- System saves updated record
- System confirms successful update
- Information is updated for that animal

#### Via an update page
- Staff uses a typeahead to search animal records
- When click, information for the animal is loaded to the update form
- Staff updates information
- System validates updated data
- Staff clicks update
- System saves updated record
- System confirms successful update
- Information is updated for the animal

### Archive Animal Record
- Staff or admin searches for animal
- System returns matching records
- User selects archive option
- System asks for confirmation
- User confirms archive action
- System marks animal as archived
- Archived animal is removed from default search results
- Archived animal remains available for audit or historical reference

# Permissions
## Viewer
- View dashboard
- Search animals
- View ranked rescue-profile results

## Staff
- All viewer permissions
- Add animals
- Update animal records
- Archive animals if allowed

## Admin
- All staff permissions
- Manage user accounts
- Change user roles
- Disable or remove user accounts

# Stretch
## Google SSO
- Add Google SSO as an alternate authentication method
- Match SSO email to existing user account when applicable
- Assign new SSO users the default viewer role

## Staff Domain Recognition
- Recognize possible staff accounts from approved email domains
- Flag those accounts for admin review
- Require admin approval before granting staff permissions