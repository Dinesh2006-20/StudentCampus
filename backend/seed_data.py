DEPARTMENTS = [
    {"code": "IT", "name": "Information Technology", "prefix": "IT"},
    {"code": "CSE", "name": "Computer Science & Engineering", "prefix": "CS"},
    {"code": "ECE", "name": "Electronics & Communication", "prefix": "EC"},
    {"code": "EEE", "name": "Electrical & Electronics", "prefix": "EE"},
    {"code": "MECH", "name": "Mechanical Engineering", "prefix": "ME"},
    {"code": "CIVIL", "name": "Civil Engineering", "prefix": "CE"},
]

EXAM_TYPES = ["Internal 1", "Internal 2", "Internal 3", "Model Exam", "Practical Exam", "Semester Exam"]

COMMON = {
    1: ["Engineering Mathematics I", "Engineering Physics", "Communicative English", "Programming in C Laboratory"],
    2: ["Engineering Mathematics II", "Engineering Chemistry", "Engineering Graphics", "Physics & Chemistry Laboratory"],
}

DEPT_SUBJECTS = {
    "IT": {
        3: ["Database Management Systems", "Data Structures", "Digital Principles", "DBMS Laboratory"],
        4: ["Operating Systems", "Design & Analysis of Algorithms", "Computer Networks", "OS Laboratory"],
        5: ["Web Technology", "Software Engineering", "Theory of Computation", "Web Technology Laboratory"],
        6: ["Cloud Computing", "Mobile Application Development", "Compiler Design", "Mobile App Laboratory"],
        7: ["Cryptography & Network Security", "Big Data Analytics", "Internet of Things", "Security Laboratory"],
        8: ["Artificial Intelligence", "DevOps Engineering", "Professional Ethics", "Project Work Laboratory"],
    },
    "CSE": {
        3: ["Object Oriented Programming", "Data Structures", "Discrete Mathematics", "OOP Laboratory"],
        4: ["Database Management Systems", "Operating Systems", "Computer Architecture", "DBMS Laboratory"],
        5: ["Computer Networks", "Theory of Computation", "Microprocessors", "Networks Laboratory"],
        6: ["Compiler Design", "Machine Learning", "Distributed Systems", "Machine Learning Laboratory"],
        7: ["Artificial Intelligence", "Cloud Computing", "Cyber Security", "AI Laboratory"],
        8: ["Deep Learning", "Blockchain Technology", "Human Values", "Project Work Laboratory"],
    },
    "ECE": {
        3: ["Electronic Devices", "Signals & Systems", "Circuit Analysis", "Electronic Devices Laboratory"],
        4: ["Analog Circuits", "Digital Electronics", "Electromagnetic Fields", "Analog Circuits Laboratory"],
        5: ["Digital Signal Processing", "Communication Theory", "Linear Integrated Circuits", "DSP Laboratory"],
        6: ["VLSI Design", "Microcontrollers", "Transmission Lines", "VLSI Laboratory"],
        7: ["Wireless Communication", "Embedded Systems", "Optical Communication", "Embedded Laboratory"],
        8: ["Satellite Communication", "Antenna Design", "Engineering Ethics", "Project Work Laboratory"],
    },
    "EEE": {
        3: ["Electric Circuit Analysis", "Electromagnetic Theory", "Electronic Devices", "Circuits Laboratory"],
        4: ["Electrical Machines I", "Control Systems", "Measurements & Instrumentation", "Machines Laboratory"],
        5: ["Electrical Machines II", "Power Electronics", "Transmission & Distribution", "Power Electronics Laboratory"],
        6: ["Power System Analysis", "Microprocessors & Controllers", "Solid State Drives", "Control Laboratory"],
        7: ["Protection & Switchgear", "Renewable Energy Systems", "High Voltage Engineering", "Power Systems Laboratory"],
        8: ["Smart Grid", "Electric Vehicles", "Engineering Ethics", "Project Work Laboratory"],
    },
    "MECH": {
        3: ["Engineering Thermodynamics", "Fluid Mechanics", "Manufacturing Technology", "Manufacturing Laboratory"],
        4: ["Strength of Materials", "Kinematics of Machinery", "Thermal Engineering", "Strength of Materials Laboratory"],
        5: ["Design of Machine Elements", "Dynamics of Machines", "Metrology", "Thermal Laboratory"],
        6: ["Heat & Mass Transfer", "Finite Element Analysis", "Automobile Engineering", "CAD Laboratory"],
        7: ["Mechatronics", "Power Plant Engineering", "Robotics", "Mechatronics Laboratory"],
        8: ["Industrial Engineering", "Additive Manufacturing", "Professional Ethics", "Project Work Laboratory"],
    },
    "CIVIL": {
        3: ["Mechanics of Solids", "Surveying", "Construction Materials", "Surveying Laboratory"],
        4: ["Structural Analysis", "Soil Mechanics", "Hydraulics", "Soil Mechanics Laboratory"],
        5: ["Design of RC Elements", "Foundation Engineering", "Environmental Engineering", "Concrete Laboratory"],
        6: ["Design of Steel Structures", "Highway Engineering", "Water Resources", "Highway Laboratory"],
        7: ["Estimation & Costing", "Prestressed Concrete", "Earthquake Engineering", "CAD Laboratory"],
        8: ["Construction Management", "Smart Cities", "Professional Ethics", "Project Work Laboratory"],
    },
}

ODD_MONTHS = {"Internal 1": "Aug", "Internal 2": "Sep", "Internal 3": "Oct", "Model Exam": "Nov", "Practical Exam": "Nov", "Semester Exam": "Dec"}
EVEN_MONTHS = {"Internal 1": "Feb", "Internal 2": "Mar", "Internal 3": "Apr", "Model Exam": "Apr", "Practical Exam": "May", "Semester Exam": "May"}

SLOTS = [("09:00", "09:50"), ("09:50", "10:40"), ("11:00", "11:50"), ("11:50", "12:40"), ("13:30", "14:20"), ("14:20", "15:10")]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def all_subjects():
    out = []
    for d in DEPARTMENTS:
        for sem in range(1, 9):
            names = COMMON.get(sem) or DEPT_SUBJECTS[d["code"]][sem]
            for i, name in enumerate(names, start=1):
                out.append({
                    "dept": d["code"], "semester": sem, "class_year": (sem + 1) // 2,
                    "code": f"{d['prefix']}{sem}{i:02d}", "name": name,
                    "is_lab": "Laboratory" in name, "credits": 2 if "Laboratory" in name else 4,
                })
    return out


def academic_year(sem: int, exam_year: int) -> str:
    return f"{exam_year}-{exam_year + 1}" if sem % 2 else f"{exam_year - 1}-{exam_year}"


def exam_meta(exam_type: str, sem: int):
    month = (ODD_MONTHS if sem % 2 else EVEN_MONTHS)[exam_type]
    if exam_type == "Semester Exam":
        return month, 100, "3 Hours"
    if exam_type == "Model Exam":
        return month, 100, "3 Hours"
    if exam_type == "Practical Exam":
        return month, 100, "3 Hours"
    return month, 50, "1.5 Hours"
