const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// ---------- Express / EJS configuration ----------
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ---------- Ensure upload folders exist ----------
const uploadDir = path.join(__dirname, "public", "uploads");
const documentDir = path.join(uploadDir, "documents");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(documentDir)) fs.mkdirSync(documentDir, { recursive: true });

// ---------- MySQL connection ----------
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    port: "3308",
    password: "root",
    database: "alumni_db"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }
    console.log("MySQL Connected.");
});

// ---------- Multer storage ----------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "profile_image") {
            cb(null, uploadDir);
        } else {
            cb(null, documentDir);
        }
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + "-" +
            Math.round(Math.random() * 1E9) + ext;
        cb(null, uniqueName);
    }
});

// ---------- File validation ----------
const allowedImageTypes = /jpeg|jpg|png|gif/;
const allowedDocumentTypes = /pdf|doc|docx/;

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase().replace(".", "");

        if (file.fieldname === "profile_image") {
            if (allowedImageTypes.test(ext)) {
                cb(null, true);
            } else {
                cb(new Error("Profile image must be JPG, JPEG, PNG, or GIF."));
            }
        } else if (file.fieldname === "resume") {
            if (allowedDocumentTypes.test(ext)) {
                cb(null, true);
            } else {
                cb(new Error("Resume must be PDF, DOC, or DOCX."));
            }
        } else {
            cb(new Error("Unexpected file field."));
        }
    }
});

// ---------- Routes ----------
app.get("/", (req, res) => {
    res.render("index");
});

app.post(
    "/register",
    upload.fields([
        { name: "profile_image", maxCount: 1 },
        { name: "resume", maxCount: 1 }
    ]),
    (req, res) => {

        try {
            const {
                full_name,
                email,
                password,
                phone,
                dob,
                gender,
                department,
                graduation_year,
                cgpa,
                degree_program,
                employment_status,
                company,
                job_title,
                contact_preference,
                linkedin,
                bio,
                newsletter,
                terms_accepted
            } = req.body;

            let skills = req.body.skills || "";
            if (Array.isArray(skills)) {
                skills = skills.join(", ");
            }

            const profileImage =
                req.files?.profile_image?.[0]?.filename || null;

            const resume =
                req.files?.resume?.[0]?.filename || null;

            if (!full_name || !email || !password || !terms_accepted) {
                return res.status(400).send(
                    "Full Name, Email, Password and Terms & Conditions are required."
                );
            }

            const sql = `
                INSERT INTO alumni
                (
                    full_name, email, password, phone, dob, gender,
                    department, graduation_year, cgpa, degree_program,
                    employment_status, company, job_title, skills,
                    contact_preference, linkedin, bio, newsletter,
                    terms_accepted, profile_image, resume
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                full_name,
                email,
                password,
                phone || null,
                dob || null,
                gender || null,
                department || null,
                graduation_year || null,
                cgpa || null,
                degree_program || null,
                employment_status || null,
                company || null,
                job_title || null,
                skills,
                contact_preference || null,
                linkedin || null,
                bio || null,
                newsletter ? 1 : 0,
                terms_accepted ? 1 : 0,
                profileImage,
                resume
            ];

            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error("INSERT error:", err);
                    return res.status(500).send("Database error.");
                }

                res.render("success", {
                    name: full_name,
                    id: result.insertId,
                    profileImage: profileImage
                });
            });

        } catch (error) {
            console.error(error);
            res.status(500).send("Server error.");
        }
    }
);

// ---------- Multer / general error handler ----------
app.use((err, req, res, next) => {
    console.error(err);

    if (err instanceof multer.MulterError) {
        return res.status(400).send(
            "Upload error: " + err.message +
            ". Maximum file size is 2 MB per file."
        );
    }

    if (err) {
        return res.status(400).send(err.message);
    }

    next();
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
