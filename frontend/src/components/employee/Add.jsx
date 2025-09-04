import React, { useEffect, useState } from "react";
import { fetchDepartments } from "../../utils/EmployeeHelper";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";

const Add = () => {
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({ role: 'employee' });
  const [designationSearch, setDesignationSearch] = useState('');
  const [showDesignationSuggestions, setShowDesignationSuggestions] = useState(false);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const navigate = useNavigate()

  // All available designations organized by technology/domain
  const allDesignations = [
    // Java Technology
    "Java Developer", "Junior Java Developer", "Senior Java Developer", "Java Full Stack Developer",
    "Java Backend Developer", "Java Spring Developer", "Java Microservices Developer",
    "Java Enterprise Developer", "Java Architect", "Java Team Lead",
    
    // Salesforce
    "Salesforce Developer", "Salesforce Administrator", "Salesforce Consultant",
    "Salesforce Architect", "Salesforce Business Analyst", "Salesforce Technical Lead",
    "Salesforce Lightning Developer", "Salesforce Integration Specialist",
    
    // SAP
    "SAP Developer", "SAP Consultant", "SAP Functional Consultant", "SAP Technical Consultant",
    "SAP ABAP Developer", "SAP HANA Developer", "SAP Basis Administrator",
    "SAP Business Analyst", "SAP Architect", "SAP Project Manager",
    
    // Python Technology
    "Python Developer", "Junior Python Developer", "Senior Python Developer",
    "Python Full Stack Developer", "Python Backend Developer", "Python Django Developer",
    "Python Flask Developer", "Python Automation Engineer", "Python Architect",
    
    // DevOps
    "DevOps Engineer", "Junior DevOps Engineer", "Senior DevOps Engineer",
    "DevOps Architect", "DevOps Consultant", "Site Reliability Engineer",
    "Infrastructure Engineer", "Build and Release Engineer", "DevOps Team Lead",
    "CI/CD Engineer", "Container Engineer", "Kubernetes Engineer",
    
    // AWS Cloud
    "AWS Developer", "AWS Solutions Architect", "AWS Cloud Engineer",
    "AWS DevOps Engineer", "AWS Data Engineer", "AWS Security Engineer",
    "AWS Consultant", "AWS Technical Lead", "AWS Infrastructure Engineer",
    "AWS Lambda Developer", "AWS Migration Specialist",
    
    // Data Science
     "Data Scientist", "Junior Data Scientist", "Senior Data Scientist",
     "Data Analyst", "Data Engineer", "Business Intelligence Analyst",
     "Data Architect", "Data Science Manager", "Quantitative Analyst",
     "Statistical Analyst", "Research Scientist", "Data Science Consultant",
     "Power BI Developer", "Senior Power BI Developer", "Junior Power BI Developer",
     "Power BI Analyst", "Power BI Consultant", "Power BI Architect",
     "Business Intelligence Developer", "BI Report Developer", "Dashboard Developer",
    
    // Generative AI
     "AI Engineer", "Machine Learning Engineer", "Gen AI Developer",
     "AI/ML Consultant", "NLP Engineer", "Computer Vision Engineer",
     "Deep Learning Engineer", "AI Research Scientist", "ML Ops Engineer",
     "AI Product Manager", "Prompt Engineer", "Senior Prompt Engineer", "Junior Prompt Engineer",
      "Prompt Engineering Specialist", "Conversational AI Designer", "AI Prompt Architect",
      "AI Solutions Architect", "LLM Engineer", "AI Ethics Specialist", "AI Backend Developer",
    
    // General IT Roles
    "Software Engineer", "Senior Software Engineer", "Junior Software Engineer",
    "Associate Software Engineer", "Software Developer", "Senior Software Developer", "Junior Software Developer", "Lead Software Engineer",
     "Principal Software Engineer", "Staff Software Engineer", "Junior Frontend Developer",
     "Frontend Developer", "Senior Frontend Developer", "Junior Backend Developer",
     "Backend Developer", "Senior Backend Developer", "Junior Full Stack Developer",
     "Full Stack Developer", "Senior Full Stack Developer", "Mobile App Developer",
     "iOS Developer", "Android Developer", "React Native Developer", "Flutter Developer",
     "Game Developer", "Web Developer", "WordPress Developer", "Shopify Developer",
     "Cloud Engineer", "Azure Engineer", "Google Cloud Engineer",
     "Junior QA Engineer", "QA Engineer", "Senior QA Engineer", "Lead QA Engineer",
      "QA Team Lead", "QA Manager", "Test Automation Engineer", "Senior Test Automation Engineer",
      "Junior Test Automation Engineer", "Performance Test Engineer", "Senior Performance Test Engineer",
      "Manual Tester", "Senior Manual Tester", "Junior Manual Tester", "Selenium Tester",
      "Senior Selenium Tester", "Junior Selenium Tester", "API Test Engineer", "Mobile Test Engineer",
      "Game Tester", "Usability Tester", "Security Tester", "Database Tester",
      "ETL Tester", "Compatibility Tester", "Regression Tester", "Load Test Engineer",
      "Stress Test Engineer", "Volume Test Engineer", "Test Analyst", "Senior Test Analyst",
      "Junior Test Analyst", "Test Consultant", "Test Architect", "SDET (Software Development Engineer in Test)",
      "Senior SDET", "Junior SDET", "Quality Assurance Specialist", "Quality Control Analyst",
     "Cybersecurity Analyst", "Security Engineer", "Penetration Tester",
     "Information Security Specialist", "Network Engineer", "Network Administrator",
     "Database Administrator", "Database Developer", "SQL Developer",
     "System Administrator", "Linux Administrator", "Windows Administrator",
     "Technical Lead", "Team Lead", "Engineering Manager", "Technical Manager",
     "Product Manager", "Project Manager", "Program Manager", "Scrum Master",
     "Agile Coach", "Business Analyst", "Systems Analyst", "Requirements Analyst",
     "HR Manager", "HR Executive", "HR Recruiter", "Senior HR Recruiter", "Junior HR Recruiter",
     "HR Assistant", "HR Coordinator", "HR Business Partner", "HR Generalist",
     "Talent Acquisition Specialist", "Recruitment Consultant", "HR Analyst",
     "UI Designer", "UX Designer", "UI/UX Designer", "Graphic Designer", "Web Designer",
     "Technical Writer", "Documentation Specialist", "IT Support Specialist",
     "Help Desk Technician", "Desktop Support Technician", "IT Consultant",
     "Solutions Architect", "Software Architect", "Enterprise Architect",
     "Cloud Architect", "Security Architect", "Blockchain Developer",
     "Smart Contract Developer", "IoT Developer", "Embedded Systems Engineer",
     "Firmware Engineer", "Hardware Engineer", "Research and Development Engineer",
     "Software Development Manager", "Chief Technology Officer (CTO)",
     "VP Engineering", "Director of Engineering"
  ];

  useEffect(() => {
    const getDepartments = async () => {
      const departments = await fetchDepartments();
      setDepartments(departments);
    };
    getDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "mobilenumber") {
      // Only allow digits and limit to 10 characters
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setFormData((prevData) => ({ ...prevData, [name]: numericValue }));
      }
    } else if (name === "designation") {
      setDesignationSearch(value);
      setFormData((prevData) => ({ ...prevData, [name]: value }));
      
      // Filter designations based on search input
      if (value.trim()) {
        const filtered = allDesignations.filter(designation =>
          designation.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredDesignations(filtered);
        setShowDesignationSuggestions(true);
      } else {
        setFilteredDesignations([]);
        setShowDesignationSuggestions(false);
      }
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mobile number before submission
    if (!formData.mobilenumber || formData.mobilenumber.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/api/employee/add`,
        formData,
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
    <div className="max-w-4xl mx-auto mt-4 md:mt-10 bg-white p-4 md:p-8 rounded-md shadow-md">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center">Add New Employee</h2>
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

          {/* Marital Status */}
         <div>
            <label className="block text-sm font-medium text-gray-700">
              Mobile Number
            </label>
            <input
              type="text"
              name="mobilenumber"
              value={formData.mobilenumber || ''}
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
              value={formData.designation || ''}
              onChange={handleChange}
              onFocus={() => {
                if (designationSearch.trim()) {
                  setShowDesignationSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowDesignationSuggestions(false), 200);
              }}
              placeholder="Search or type designation..."
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
              required
            />
            
            {/* Suggestions dropdown */}
            {showDesignationSuggestions && filteredDesignations.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredDesignations.slice(0, 10).map((designation, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      setFormData((prevData) => ({ ...prevData, designation }));
                      setDesignationSearch(designation);
                      setShowDesignationSuggestions(false);
                    }}
                  >
                    {designation}
                  </div>
                ))}
                {filteredDesignations.length > 10 && (
                  <div className="px-3 py-2 text-xs text-gray-500 border-t">
                    Showing first 10 results. Keep typing to narrow down...
                  </div>
                )}
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

         

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="******"
              onChange={handleChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Role - Hidden field with default value */}
          <input
            type="hidden"
            name="role"
            value="employee"
          />


        </div>

        <button
          type="submit"
          className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Employee
        </button>
      </form>
    </div>
  );
};

export default Add;
