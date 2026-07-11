// Create aacuser with readWrite access to the aac database.
// This script runs on first container startup as the root admin.
db.getSiblingDB('admin').createUser({
    user: "aacuser",
    pwd: "SNHU1234",
    roles: [
        { role: "readWrite", db: "aac" }
    ]
});
