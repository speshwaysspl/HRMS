import React, { useEffect, useState } from "react";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";

const Edit = () => {
  const [employee, setEmployee] = useState({
    name: "",
    email: "",
    employeeId: "",
    dob: "",
    joiningDate: "",
    gender: "",
    mobilenumber: "",
    designation: "",
    department: "",
  });
  const [departments, setDepartments] = useState(null);
  const [designationSearch, setDesignationSearch] = useState("");
  const [showDesignationSuggestions, setShowDesignationSuggestions] = useState(false);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();

  // Comprehensive list of IT designations
  const allDesignations = [
    // Java
    "Java Developer", "Senior Java Developer", "Junior Java Developer",
    "Java Full Stack Developer", "Java Backend Developer", "Java Architect",
    "Spring Boot Developer", "Java Team Lead", "Java Technical Lead",

    // Salesforce
    "Salesforce Developer", "Senior Salesforce Developer", "Junior Salesforce Developer",
    "Salesforce Administrator", "Salesforce Consultant", "Salesforce Architect",
    "Salesforce Business Analyst", "Salesforce Technical Lead", "CRM Developer",

    // SAP
    "SAP Developer", "SAP Consultant", "SAP Functional Consultant",
    "SAP Technical Consultant", "SAP ABAP Developer", "SAP Basis Administrator",
    "SAP FICO Consultant", "SAP MM Consultant", "SAP SD Consultant",
    "SAP HANA Developer", "SAP Architect", "SAP Project Manager",

    // Python
    "Python Developer", "Senior Python Developer", "Junior Python Developer",
    "Python Full Stack Developer", "Python Backend Developer", "Django Developer",
    "Flask Developer", "Python Data Engineer", "Python Automation Engineer",

    // DevOps
    "DevOps Engineer", "Senior DevOps Engineer", "Junior DevOps Engineer",
    "DevOps Architect", "Site Reliability Engineer", "Infrastructure Engineer",
    "CI/CD Engineer", "Cloud DevOps Engineer", "DevOps Consultant",
    "Build and Release Engineer", "Platform Engineer", "DevSecOps Engineer",

    // AWS
    "AWS Developer", "AWS Solutions Architect", "AWS Cloud Engineer",
    "AWS DevOps Engineer", "AWS Data Engineer", "AWS Security Engineer",
    "AWS Consultant", "Cloud Infrastructure Engineer", "AWS Lambda Developer",

    // Data Science
    "Data Scientist", "Senior Data Scientist", "Junior Data Scientist",
    "Data Analyst", "Senior Data Analyst", "Junior Data Analyst",
    "Machine Learning Engineer", "Data Engineer", "Big Data Engineer",
    "Business Intelligence Analyst", "Statistical Analyst", "Research Scientist",
    "Power BI Developer", "Senior Power BI Developer", "Junior Power BI Developer",
    "Power BI Analyst", "Power BI Consultant", "Power BI Architect",
    "Business Intelligence Developer", "BI Report Developer", "Dashboard Developer",

    // Generative AI
    "AI Engineer", "Machine Learning Specialist", "AI Research Engineer",
    "AI/ML Consultant", "NLP Engineer", "Computer Vision Engineer",
    "Deep Learning Engineer", "AI Research Scientist", "ML Ops Engineer",
    "AI Product Manager", "Prompt Engineer", "Senior Prompt Engineer", "Junior Prompt Engineer",
    "Prompt Engineering Specialist", "Conversational AI Designer", "AI Prompt Architect",
    "AI Solutions Architect", "LLM Engineer", "AI Ethics Specialist", "AI Backend Developer",

    // General IT Roles
    "Software Engineer", "Senior Software Engineer", "Junior Software Engineer",
    "Associate Software Engineer", "Software Developer", "Senior Software Developer", "Junior Software Developer",
    "Full Stack Developer", "Frontend Developer", "Backend Developer",
    "Web Developer", "Mobile App Developer", "iOS Developer", "Android Developer",
    "React Developer", "Angular Developer", "Vue.js Developer", "Node.js Developer",
    "PHP Developer", ".NET Developer", "C# Developer", "C++ Developer",
    "JavaScript Developer", "TypeScript Developer", "Ruby Developer",
    "Go Developer", "Rust Developer", "Kotlin Developer", "Swift Developer",
    "Database Developer", "Database Administrator", "SQL Developer",
    "System Administrator", "Network Administrator", "Security Engineer",
    "Cybersecurity Analyst", "Information Security Analyst", "Penetration Tester",
    "Ethical Hacker", "Security Consultant", "IT Support Specialist",
    "Technical Support Engineer", "Help Desk Technician", "IT Consultant",
    "Solutions Architect", "Enterprise Architect", "Cloud Architect",
    "Technical Architect", "Software Architect", "System Analyst",
    "Business Analyst", "Technical Writer", "Documentation Specialist",
    "Scrum Master", "Agile Coach", "Project Manager", "Technical Project Manager",
    "Product Manager", "Product Owner", "Engineering Manager",
    "Technical Lead", "Team Lead", "Development Manager",
    "CTO", "VP of Engineering", "Director of Technology",
    "UI/UX Designer", "UI Designer", "UX Designer", "Graphic Designer",
    "Quality Assurance Engineer", "QA Engineer", "Test Engineer",
    "Junior QA Engineer", "Senior QA Engineer", "QA Lead", "Test Lead",
    "QA Manager", "Test Manager", "Quality Analyst", "Manual Tester",
    "Automation Tester", "SDET", "Performance Test Engineer", "Load Test Engineer",
    "Security Tester", "Mobile Test Engineer", "API Test Engineer",
    "Game Tester", "Usability Tester", "Accessibility Tester",
    "Test Automation Architect", "QA Consultant", "Testing Specialist",
    "Selenium Tester", "Cypress Tester", "Appium Tester",

    // HR Roles
    "HR Manager", "HR Executive", "HR Recruiter", "HR Assistant",
    "HR Coordinator", "HR Business Partner", "HR Generalist",
    "Talent Acquisition Specialist", "Recruitment Consultant", "HR Analyst"
  ];

  useEffect(() => {
    const getDepartments = async () => {
      const departments = await fetchDepartments();
      setDepartments(departments);
    };
    getDepartments();
  }, []);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const responnse = await axios.get(
          `${API_BASE}/api/employee/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (responnse.data.success) {
          const employee = responnse.data.employee;
          setEmployee((prev) => ({
            ...prev,
            name: employee.userId.name,
            email: employee.userId.email,
            employeeId: employee.employeeId,
            dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : "",
            joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : "",
            gender: employee.gender || "",
            mobilenumber: employee.mobilenumber,
            designation: employee.designation,
            department: employee.department,
            role: employee.userId.role,
          }));
          // Initialize designation search with existing value
          setDesignationSearch(employee.designation || "");
        }
      } catch (error) {
        if (error.response && !error.response.data.success) {
          alert(error.response.data.error);
        }
      }
    };

    fetchEmployee();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "mobilenumber") {
      // Only allow digits and limit to 10 characters
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setEmployee((prevData) => ({ ...prevData, [name]: numericValue }));
      }
    } else if (name === "designation") {
      setEmployee((prevData) => ({ ...prevData, [name]: value }));
      setDesignationSearch(value);
      
      if (value.trim()) {
        const filtered = allDesignations.filter(designation =>
          designation.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions for performance
        setFilteredDesignations(filtered);
        setShowDesignationSuggestions(true);
      } else {
        setFilteredDesignations(allDesignations.slice(0, 10));
        setShowDesignationSuggestions(true);
      }
    } else {
      setEmployee((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleDesignationSelect = (designation) => {
    setEmployee((prevData) => ({ ...prevData, designation }));
    setDesignationSearch(designation);
    setShowDesignationSuggestions(false);
    setFilteredDesignations([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mobile number before submission
    if (!employee.mobilenumber || employee.mobilenumber.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    // Filter out null and empty values
    const cleanedEmployee = Object.keys(employee).reduce((acc, key) => {
      if (employee[key] !== null && employee[key] !== "") {
        acc[key] = employee[key];
      }
      return acc;
    }, {});

    try {
      const response = await axios.put(
        `${API_BASE}/api/employee/${id}`,
        cleanedEmployee,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.success) {
        navigate("/admin-dashboard/employees");
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        alert(error.response.data.error);
      }
    }
  };

  return (
    <>
      {departments && employee ? (
        <div className="max-w-4xl mx-auto mt-4 md:mt-10 bg-white p-4 md:p-8 rounded-md shadow-md">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center">Edit Employee</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={employee.name}
                  onChange={handleChange}
                  placeholder="Insert Name"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={employee.email}
                  onChange={handleChange}
                  placeholder="Insert Email"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={employee.employeeId}
                  onChange={handleChange}
                  placeholder="Employee ID"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={employee.dob}
                  onChange={handleChange}
                  placeholder="DOB"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={employee.joiningDate}
                  onChange={handleChange}
                  placeholder="Joining Date"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={employee.gender}
                  onChange={handleChange}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="mobilenumber"
                  value={employee.mobilenumber || ''}
                  onChange={handleChange}
                  placeholder="Mobile Number (10 digits)"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  title="Please enter exactly 10 digits"
                  required
                />
              </div>

              {/* Designation */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={designationSearch}
                  onChange={handleChange}
                  onFocus={() => {
                    if (designationSearch.trim()) {
                      const filtered = allDesignations.filter(designation =>
                        designation.toLowerCase().includes(designationSearch.toLowerCase())
                      ).slice(0, 10);
                      setFilteredDesignations(filtered);
                      setShowDesignationSuggestions(true);
                    } else {
                      // Show all designations when field is empty
                      setFilteredDesignations(allDesignations.slice(0, 10));
                      setShowDesignationSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow for selection
                    setTimeout(() => setShowDesignationSuggestions(false), 200);
                  }}
                  placeholder="Search or type designation"
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                />
                
                {/* Designation Suggestions Dropdown */}
                {showDesignationSuggestions && filteredDesignations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredDesignations.map((designation, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        onMouseDown={() => handleDesignationSelect(designation)}
                      >
                        {designation}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  name="department"
                  onChange={handleChange}
                  value={employee.department}
                  className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dep) => (
                    <option key={dep._id} value={dep._id}>
                      {dep.dep_name}
                    </option>
                  ))}
                </select>
              </div>




            </div>

            <button
              type="submit"
              className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
            >
              Edit Employee
            </button>
          </form>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
};

export default Edit;
