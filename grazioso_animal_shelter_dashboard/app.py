"""Grazioso Salvare dashboard as a deployable Dash app.

Extracted from ProjectTwoDashboard.ipynb so the dashboard can run under a
WSGI server (gunicorn app:server) on Render. The notebook remains the local
development environment against the Docker MongoDB.
"""
import base64
import os

import dash_leaflet as dl
import pandas as pd
import plotly.express as px
from dash import Dash, dash_table, dcc, html
from dash.dependencies import Input, Output
from dotenv import load_dotenv

from CRUD_Python_Module import AnimalShelter

###########################
# Data Manipulation / Model
###########################

# Local runs read the gitignored Atlas credentials file; on Render the same
# variables come from the service environment.
load_dotenv("atlas-credentials.env")

mongodb_uri = os.environ.get("MONGODB_URI")
mongodb_username = os.environ.get("MONGODB_USERNAME", "aacuser")
mongodb_password = os.environ.get("MONGODB_PASSWORD", "SNHU1234")

# Atlas connection strings ship with a literal password placeholder.
if mongodb_uri:
    for placeholder in ("<db_password>", "<password>"):
        mongodb_uri = mongodb_uri.replace(placeholder, mongodb_password)

shelter = AnimalShelter(uri=mongodb_uri)
shelter.login(mongodb_username, mongodb_password)

df = pd.DataFrame.from_records(shelter.read({}))
if df.empty:
    raise RuntimeError(
        "The aac.animals collection is empty or unreachable. "
        "Seed it with: python seed_atlas.py"
    )

# ObjectId values crash the data table.
df.drop(columns=["_id"], inplace=True, errors="ignore")

#########################
# Dashboard Layout / View
#########################

app = Dash(__name__)
server = app.server

header_image_filename = "Grazioso Salvare Logo.png"
header_image = base64.b64encode(open(header_image_filename, "rb").read())
header_image_html = html.Img(
    src=f"data:image/png;base64,{header_image.decode()}", height=200, width=200
)
dropdown_options = [
    {"label": "Water Rescue", "value": 1},
    {"label": "Mountain or Wilderness Rescue", "value": 2},
    {"label": "Disaster Rescue or Individual Tracking", "value": 3},
]

app.layout = html.Div([
    html.Div(id="hidden-div", style={"display": "none"}),
    html.Center(html.B(html.H1("CS-340 Dashboard"))),
    html.Center(html.H2("Emilio Crocco - 2/17/2026")),
    html.Hr(),
    html.Center(html.A(children=[header_image_html], href="https://www.snhu.edu")),
    html.Hr(),
    html.Div(children=[
        html.Label('Select a filter and press "X" to clear'),
        dcc.Dropdown(
            id="filter-type",
            options=dropdown_options,
            value=None,
            searchable=False,
            placeholder="Select a filter",
            style={"max-width": "30%"},
        ),
    ]),
    html.Hr(),
    dash_table.DataTable(
        id="datatable-id",
        columns=[
            {"name": i, "id": i, "deletable": False, "selectable": True} for i in df.columns
        ],
        data=df.to_dict("records"),
        editable=False,
        filter_action="native",
        sort_action="native",
        sort_mode="multi",
        column_selectable=False,
        row_selectable="single",
        row_deletable=False,
        selected_columns=[],
        selected_rows=[0],
        page_action="native",
        page_current=0,
        page_size=10,
    ),
    html.Br(),
    html.Hr(),
    html.Div(
        className="row",
        style={"display": "flex", "gap": "2%"},
        children=[
            html.Div(id="graph-id", className="col s12 m6", style={"flex": "1", "minWidth": "0"}),
            html.Div(id="map-id", className="col s12 m6", style={"flex": "1", "minWidth": "0"}),
        ],
    ),
])

#############################################
# Interaction Between Components / Controller
#############################################


@app.callback(
    Output("datatable-id", "data"),
    Output("datatable-id", "page_current"),
    Output("datatable-id", "selected_rows"),
    [Input("filter-type", "value")],
)
def update_dashboard(filter_type):
    water_rescue_query = {
        "animal_type": "Dog",
        "breed": {"$in": ["Labrador Retriever Mix", "Chesapeake Bay Retriever", "Newfoundland"]},
        "sex_upon_outcome": "Intact Female",
        "age_upon_outcome_in_weeks": {"$gte": 26, "$lte": 156},
    }
    mountain_wilderness_query = {
        "animal_type": "Dog",
        "breed": {"$in": ["German Shepherd", "Alaskan Malamute", "Old English Sheepdog", "Siberian Husky", "Rottweiler"]},
        "sex_upon_outcome": "Intact Male",
        "age_upon_outcome_in_weeks": {"$gte": 26, "$lte": 156},
    }
    disaster_individual_query = {
        "animal_type": "Dog",
        "breed": {"$in": ["Doberman Pinscher", "German Shepherd", "Golden Retriever", "Bloodhound", "Rottweiler"]},
        "sex_upon_outcome": "Intact Male",
        "age_upon_outcome_in_weeks": {"$gte": 20, "$lte": 300},
    }

    if filter_type == 1:
        dff = pd.DataFrame.from_records(shelter.read(water_rescue_query))
        dff.drop(columns=["_id"], inplace=True, errors="ignore")
    elif filter_type == 2:
        dff = pd.DataFrame.from_records(shelter.read(mountain_wilderness_query))
        dff.drop(columns=["_id"], inplace=True, errors="ignore")
    elif filter_type == 3:
        dff = pd.DataFrame.from_records(shelter.read(disaster_individual_query))
        dff.drop(columns=["_id"], inplace=True, errors="ignore")
    else:
        dff = df

    data = dff.to_dict("records")
    return data, 0, [0]


@app.callback(Output("graph-id", "children"), [Input("datatable-id", "derived_virtual_data")])
def update_graphs(viewData):
    if not viewData:
        chart_data = df
    else:
        chart_data = pd.DataFrame.from_dict(viewData)

    # Group breeds under 0.75% of the filtered set into 'Other'.
    breed_counts = chart_data["breed"].value_counts().reset_index()
    breed_counts.columns = ["breed", "count"]
    total = breed_counts["count"].sum()
    breed_counts["breed"] = breed_counts.apply(
        lambda row: row["breed"] if (row["count"] / total * 100) >= 0.75 else "Other",
        axis=1,
    )
    breed_counts = breed_counts.groupby("breed", as_index=False)["count"].sum()

    return [
        dcc.Graph(
            figure=px.pie(breed_counts, names="breed", values="count", title="Preferred Animals")
        )
    ]


@app.callback(
    Output("datatable-id", "style_data_conditional"),
    [Input("datatable-id", "selected_columns")],
)
def update_styles(selected_columns):
    return [{"if": {"column_id": i}, "background_color": "#D2F3FF"} for i in selected_columns]


@app.callback(
    Output("map-id", "children"),
    [Input("datatable-id", "derived_virtual_data"),
     Input("datatable-id", "derived_virtual_selected_rows")],
)
def update_map(viewData, index):
    clean_map = dl.Map(
        style={"width": "1000px", "height": "500px"},
        center=[30.75, -97.48], zoom=10,
        children=[dl.TileLayer(id="base-layer-id")],
    )

    if viewData is None or len(viewData) == 0:
        return [html.Div(id="container-div", style={"display": "flex"}, children=[clean_map])]

    dff = pd.DataFrame.from_dict(viewData)
    # Single row selection only; an empty list means nothing selected yet.
    if not index:
        row = 0
    else:
        row = index[0]

    # Columns 13 and 14 hold the grid coordinates; skip the marker when absent.
    if pd.isna(pd.to_numeric(dff.iloc[row, 13], errors="coerce")) or pd.isna(
        pd.to_numeric(dff.iloc[row, 14], errors="coerce")
    ):
        return [html.Div(id="container-div", style={"display": "flex"}, children=[clean_map])]

    return [
        html.Div(
            id="container-div",
            style={"display": "flex"},
            children=[
                dl.Map(
                    style={"width": "1000px", "height": "500px"},
                    center=[dff.iloc[row, 13], dff.iloc[row, 14]], zoom=10,
                    children=[
                        dl.TileLayer(id="base-layer-id"),
                        # Column 4 is the breed, column 9 the animal name.
                        dl.Marker(
                            position=[dff.iloc[row, 13], dff.iloc[row, 14]],
                            children=[
                                dl.Tooltip(dff.iloc[row, 4]),
                                dl.Popup([html.H1("Animal Name"), html.P(dff.iloc[row, 9])]),
                            ],
                        ),
                    ],
                ),
            ],
        ),
    ]


if __name__ == "__main__":
    app.run(debug=False)
