# Grazioso Salvare Animal Shelter Dashboard

**Author:** Emilio Crocco
**Course:** CS-340: Client/Server Development — Southern New Hampshire University
**Date:** February 19, 2026

---

## About the Project

This project is a Python-based interactive dashboard designed to analyze and visualize animal shelter outcome data from the Austin Animal Center. The dashboard connects to a MongoDB database and allows users to filter animals by rescue type, view matching records in a data table, and examine breed distribution and geographic location data in real time.

The dashboard serves as the front-end application for the `AnimalShelter` CRUD Python module developed in Project One. While Project One focused on implementing secure Create, Read, Update, and Delete operations, this project builds upon that work by integrating the module into a complete Model-View-Controller web application.

The application follows the MVC design pattern:

| Layer | Component |
|-------|-----------|
| **Model** | MongoDB database storing the Austin Animal Center Outcomes dataset |
| **View** | Dash layout components: dropdown menu, data table, pie chart, and geolocation map |
| **Controller** | Dash callback functions that query MongoDB using the `AnimalShelter` class and update visual components dynamically |

---

## Required Functionality

The dashboard was required to meet the following functional requirements:

- Display all animal records when the application loads
- Allow users to filter animals by predefined rescue categories
- Dynamically update all visual components when a filter is selected
- Provide interactive table features including pagination and row selection
- Display the selected animal's geographic coordinates on a map
- Show breed distribution of the filtered results using a pie chart

### Initial State

When first launched, the dashboard displays the complete dataset in an unfiltered state. The dropdown reads "Select a filter," and all widgets reflect the full collection of records.

---

### Water Rescue Filter

Filters for dogs matching the Water Rescue profile:

- **Breeds:** Labrador Retriever Mix, Chesapeake Bay Retriever, Newfoundland
- **Sex:** Intact Female
- **Age Range:** 26 to 156 weeks

When selected, the data table, pie chart, and map update automatically to reflect only matching records.

---

### Mountain or Wilderness Rescue Filter

Filters for dogs matching the Mountain or Wilderness Rescue profile:

- **Breeds:** German Shepherd, Alaskan Malamute, Old English Sheepdog, Siberian Husky, Rottweiler
- **Sex:** Intact Male
- **Age Range:** 26 to 156 weeks

---

### Disaster or Individual Tracking Filter

Filters for dogs matching the Disaster or Individual Tracking profile:

- **Breeds:** Doberman Pinscher, German Shepherd, Golden Retriever, Bloodhound, Rottweiler
- **Sex:** Intact Male
- **Age Range:** 20 to 300 weeks

---

### Reset Function

Clearing the dropdown selection restores the dashboard to its original unfiltered state.

---

## Motivation

The motivation for this project was to gain practical experience integrating a Python data-access layer with a web-based visualization framework. Building on the CRUD module from Project One, this dashboard demonstrates how backend database logic can support interactive analytics tools.

This project also reinforces the importance of separating responsibilities within an application. By keeping database logic within the `AnimalShelter` class and presentation logic within Dash callbacks, the system remains modular, maintainable, and easier to extend.

---

## Tools Used

### MongoDB

MongoDB was selected as the model component of the application for several reasons.

Its document-oriented structure allows shelter records to be stored without enforcing a rigid schema, which is beneficial when working with datasets that may evolve over time.

MongoDB also integrates seamlessly with Python through the PyMongo driver. Queries are written using standard Python dictionaries, which simplifies the implementation of complex filters such as breed matching and age ranges. Operators like `$in`, `$gte`, and `$lte` directly power the rescue profile filters in the dashboard — breed lists are matched with `$in`, while age ranges are enforced using `$gte` and `$lte`, allowing each rescue category to be expressed as a single structured query document.

Compared to a traditional relational database, MongoDB eliminates the need for predefined table joins or rigid schemas, making it especially well suited for semi-structured datasets like shelter outcome records. It also supports indexing and efficient querying across large collections, making it suitable for scalable data-driven applications.

### Dash Framework

Dash was selected to implement the view and controller components of the application.

Dash allows the entire application to be written in Python without requiring JavaScript. Its callback system enables components to update automatically whenever input values change. In this dashboard, controller logic is implemented through Dash callback functions that receive the selected dropdown value as input and return updated properties for multiple components simultaneously.

A single callback connects the dropdown filter to the MongoDB query and then updates the data table records, pie chart figure, and map markers at the same time. This reactive architecture ensures that all visual components remain synchronized with the underlying filtered dataset.

Dash components used in this project:

| Component | Purpose |
|-----------|---------|
| `dash_table.DataTable` | Interactive record display with sorting, filtering, and pagination |
| `plotly.express` | Breed distribution pie chart |
| `dash_leaflet` | Geolocation map showing selected animal coordinates |

### Additional Tools

- Python 3.x
- PyMongo — MongoDB Python driver
- pandas — DataFrame transformation of query results
- numpy — Numerical support for data operations
- Docker and Docker Compose — Containerized local MongoDB instance
- Jupyter Notebook — Interactive development and deployment environment

---

## Installation

### Prerequisites

- Python 3.x
- Docker Desktop installed and running
- The following files present in the project directory:
  - `ProjectTwoDashboard.ipynb`
  - `CRUD_Python_Module.py`
  - `aac_shelter_outcomes.csv`
  - `Grazioso Salvare Logo.png`
  - `docker-compose.yaml`
  - `mongo-init/import.sh`
  - `mongo-init/init.js`

### Getting Started

1. **Start the MongoDB container:**
   ```bash
   docker compose up -d
   ```
   On first run, this automatically imports `aac_shelter_outcomes.csv` into the `aac.animals` collection and creates the scoped `aacuser` database account.

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements-dev.txt
   ```
   `requirements.txt` holds only the runtime dependencies used by the deployed app; the dev file adds Jupyter and plotting extras for the notebook.

3. **Open `ProjectTwoDashboard.ipynb`** in JupyterLab or VS Code with the Jupyter extension.

4. **Run the notebook cell.** The dashboard starts and prints a local URL (default `http://127.0.0.1:8050`). Open that URL in a browser to interact with the dashboard.

### Stopping

- Interrupt the Jupyter notebook kernel to stop the Dash server.
- `docker compose down` — stops the MongoDB container (data is preserved)
- `docker compose down -v` — stops the container and removes all stored data

---

## Deployment (Render + MongoDB Atlas)

**Live at: https://grazioso-dashboard.onrender.com/** (free instance — allow 30 to 60 seconds for cold start after idle periods)

The dashboard deploys as a Render free web service backed by a MongoDB Atlas free (M0) cluster. `app.py` contains the same dashboard as the notebook, extracted so gunicorn can serve it; the notebook remains the local development environment.

### One-time setup

1. **Atlas:** create a free M0 cluster and a database user. Save the connection string, username, and password in `atlas-credentials.env` (gitignored) as `MONGODB_URI`, `MONGODB_USERNAME`, and `MONGODB_PASSWORD`. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) — Render free services have no fixed outbound IPs.

2. **Seed the cluster:**
   ```bash
   python seed_atlas.py
   ```
   This imports `aac_shelter_outcomes.csv` into `aac.animals`, mirroring what `mongo-init/import.sh` does for the local container. Rerun with `--force` to replace existing data.

3. **Render:** create a new Blueprint from this repository — `render.yaml` at the repo root defines the service with `grazioso_animal_shelter_dashboard` as its root directory. When prompted, supply `MONGODB_URI`, `MONGODB_USERNAME`, and `MONGODB_PASSWORD` from `atlas-credentials.env`.

### Ongoing

Pushes to the connected branch redeploy automatically. The free instance spins down after about 15 minutes of inactivity; the first request afterwards takes 30 to 60 seconds while it cold-starts.

### Running the deployed app locally

```bash
pip install -r requirements.txt
python app.py
```

With `atlas-credentials.env` present it connects to Atlas; without it, it falls back to the local Docker MongoDB from the Getting Started steps.

---

## Steps Taken to Complete the Project

1. Imported the Austin Animal Center dataset into MongoDB
2. Configured authentication and created a scoped database user
3. Developed and tested the `AnimalShelter` CRUD module
4. Designed the Dash layout structure
5. Implemented callback functions to connect user input to MongoDB queries
6. Tested each rescue profile to verify correct filtering behavior
7. Resolved pagination and map callback errors
8. Validated final functionality through testing and screenshots

---

## Challenges and Solutions

**Dash and notebook integration compatibility**
The original starter code used the `jupyter-dash` package, which is incompatible with Dash 4.0. This caused the notebook kernel to hang during execution. The solution was to replace `jupyter-dash` with Dash's native Jupyter support and update the run configuration to `app.run(jupyter_mode='external')`.

**MongoDB authentication in Docker**
Configuring MongoDB within Docker required balancing initialization requirements against security. To avoid using root credentials in the application, a scoped `aacuser` account was created via an init script that runs automatically on first container start, with access limited to the `aac` database.

**Pagination reset on filter change**
Switching rescue type filters could leave the data table on a page that no longer existed in the smaller result set, resulting in a blank table. This was resolved by adding `page_current` and `selected_rows` as additional callback outputs, resetting both to `0` and `[0]` on every filter change.

**Map callback crash on empty selection**
After a filter change, Dash sends `derived_virtual_selected_rows` as an empty list `[]` rather than `None`. The original `if index is None` guard did not handle this, causing an `IndexError`. The guard was updated to `if not index`, which safely handles both `None` and `[]`.

---

## Resources

- [Dash Documentation](https://dash.plotly.com/)
- [Dash DataTable Reference](https://dash.plotly.com/datatable)
- [Dash Leaflet](https://www.dash-leaflet.com/)
- [PyMongo Documentation](https://www.mongodb.com/docs/drivers/pymongo/)
- [MongoDB](https://www.mongodb.com/)
- [Docker](https://www.docker.com/)
- Austin Animal Center. (2020). *Austin Animal Center Outcomes* [Data set]. City of Austin, Texas Open Data Portal. https://doi.org/10.26000/025.000001

---

## Contact

**Emilio Crocco**
emilio.crocco@snhu.edu
