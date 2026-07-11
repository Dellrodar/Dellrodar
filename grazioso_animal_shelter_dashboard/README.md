# Grazioso Salvare Animal Shelter Dashboard

A full-stack Python application built for CS-340 at Southern New Hampshire University. The dashboard connects a MongoDB backend to an interactive Dash web interface, allowing Grazioso Salvare staff to filter shelter animal records by rescue type and visualize results through a data table, pie chart, and geolocation map.

---

## Portfolio Reflection

### How do you write programs that are maintainable, readable, and adaptable?

The clearest example from this project is the `AnimalShelter` CRUD Python module developed in Project One. Rather than writing raw PyMongo queries directly inside the dashboard code, all database logic was encapsulated in a single class with clearly defined methods: `create`, `read`, `update`, and `delete`. Each method validates its inputs, handles exceptions internally, and returns a predictable type, so any code that calls it does not need to know anything about how MongoDB works underneath.

This separation paid off directly in Project Two. When the dashboard needed to filter animals by rescue type, the callback functions simply called `shelter.read(query)` with different query dictionaries. The dashboard had no knowledge of connection strings, cursors, or ObjectID handling; all of that was already resolved in the module. If the database were ever migrated to a different host, or if the collection name changed, only one file would need updating.

The same module could be reused in any number of future contexts: a REST API layer, a command-line reporting tool, a scheduled data pipeline, or another dashboard built for a different client. Because the interface is stable and the implementation details are hidden, the module becomes a reliable building block rather than code that has to be rewritten each time.

### How do you approach a problem as a computer scientist?

For this project, I started by fully understanding the client requirements before writing any code. Grazioso Salvare needed specific rescue profiles: exact breed lists, sex, and age ranges for Water, Mountain/Wilderness, and Disaster rescue types. Before building the filter UI or writing a single callback, I mapped those requirements directly to MongoDB query structures, verifying that the data in the collection actually matched what the queries would return.

This was different from many previous assignments, which tended to present a well-defined technical problem with a known solution pattern. Here, the requirements came from a client scenario, which meant ambiguity had to be resolved upfront. The MVC design pattern provided a useful framework for decomposing the problem: decide what data the model needs to expose, decide what the view needs to display, and then build the controller to connect them. Keeping those layers separate made it easier to test each piece independently and debug issues without the entire system being involved.

For future database projects, I would apply the same approach: translate client requirements into data access patterns first, then design the schema and query structure around those patterns rather than building the database in the abstract and hoping it fits later.

### What do computer scientists do, and why does it matter?

Computer scientists solve problems by building systems that allow people to work more effectively with information. In this project, that meant taking a raw CSV dataset of thousands of shelter animal records, data that would be impractical to search manually, and building an interface that lets Grazioso Salvare staff identify qualified rescue dog candidates in seconds.

Without a tool like this, finding dogs that match a specific rescue profile would require manually reviewing records or writing one-off database queries. With the dashboard, a staff member with no technical background can select a rescue type from a dropdown and immediately see a filtered list of candidates, a map of their locations, and a visual breakdown of breeds. The time savings are significant, but more importantly, the tool reduces the chance that a qualified candidate is overlooked because the data was too unwieldy to search.

This is what makes software engineering meaningful in a professional context: the goal is not the code itself, but the capability it gives real people to do their work better and with greater confidence.
