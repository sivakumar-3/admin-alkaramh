import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Settings, Plus, Edit, X, Download } from "lucide-react";
import { Switch } from "@headlessui/react";
import Sidebar from "../../components/admin/sidebar";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import placeholder from "../../images/placeholder.svg";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useLanguage } from "../../LanguageContext";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const { language } = useLanguage();
  const [previewImage, setPreviewImage] = useState(
    selectedCategory?.imageUrl || ""
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const translations = {
    en: {
      categories: "Categories",
      searchPlaceholder: "Search categories...",
      addCategory: "Add Category",
      export: "Export",
      image: "Image",
      name: "Name",
      status: "Status",
      actions: "Actions",
      active: "Active",
      inactive: "Inactive",
      editCategory: "Edit Category",
      addNewCategory: "Add New Category",
      categoryId: "Category ID",
      categoryName: "Category Name",
      arabicName: "Arabic Name",
      imageUrl: "Image URL",
      activeStatus: "Active Status",
      saveCategory: "Save Category",
      toggleStatus: "Toggle Status",
    },
    ar: {
      categories: "الفئات",
      searchPlaceholder: "ابحث في الفئات...",
      addCategory: "إضافة فئة",
      export: "تصدير",
      image: "صورة",
      name: "الاسم",
      status: "الحالة",
      actions: "إجراءات",
      active: "نشط",
      inactive: "غير نشط",
      editCategory: "تعديل الفئة",
      addNewCategory: "إضافة فئة جديدة",
      categoryId: "معرف الفئة",
      categoryName: "اسم الفئة",
      arabicName: "الاسم بالعربية",
      imageUrl: "رابط الصورة",
      activeStatus: "حالة النشاط",
      saveCategory: "حفظ الفئة",
      toggleStatus: "تبديل الحالة",
    },
  };

  const t = translations[language] || translations.en;

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "category"));
      const categoriesList = querySnapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesList);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setIsAddingCategory(false);
  };

  const handleExportToExcel = () => {
    if (!categories.length) {
      toast.error("No categories to export");
      return;
    }

    const csvData = categories.map((cat) => ({
      Name: cat.name,
      Status: cat.is_active ? "Active" : "Inactive",
      ID: cat.id,
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "categories.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveCategory = async (category) => {
    try {
      if (!category.name.trim()) {
        toast.error("Category name cannot be empty");
        return;
      }
  
      let updatedCategories = [...categories];
  
      if (isAddingCategory) {
        category.id = uuidv4();
  
        const docRef = await addDoc(collection(db, "category"), category);
        category.docId = docRef.id;
        updatedCategories.push(category);
      } else {
        if (!category.docId) {
          toast.error("Invalid document reference.");
          return;
        }
  
        const categoryRef = doc(db, "category", category.docId);
        const categorySnapshot = await getDoc(categoryRef);
  
        if (!categorySnapshot.exists()) {
          toast.error("Category does not exist. Cannot update.");
          return;
        }
  
        await updateDoc(categoryRef, {
          name: category.name,
          arabic_name: category.arabic_name,
          imageUrl: category.imageUrl, // Ensure image URL is updated in Firestore
          is_active: category.is_active,
        });
  
        updatedCategories = updatedCategories.map((cat) =>
          cat.docId === category.docId ? { ...cat, ...category } : cat
        );
      }
  
      setCategories(updatedCategories);
      setSelectedCategory(null);
      setIsAddingCategory(false);
      toast.success("Category saved successfully!");
      
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    }
  };
  

  const handleAddImage = (e) => {
    e.preventDefault();
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    
    fileInput.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
  
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "product_images");
        formData.append("cloud_name", "df3plfcau");
  
        const res = await fetch("https://api.cloudinary.com/v1_1/df3plfcau/image/upload", {
          method: "POST",
          body: formData,
        });
  
        const data = await res.json();
        if (!data.secure_url) throw new Error("Image upload failed");
  
        // Update state properly
        setSelectedCategory((prev) => {
          if (!prev) return null; 
          return { ...prev, imageUrl: data.secure_url };
        });
  
        setPreviewImage(data.secure_url);
        toast.success("Image uploaded successfully!");
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Image upload failed. Try again.");
      }
    };
  
    fileInput.click();
  };
  

  const handleStatusToggle = async (category) => {
    try {
      if (!category.docId) {
        toast.error("Invalid category reference.");
        return;
      }

      const categoryRef = doc(db, "category", category.docId);
      const categorySnapshot = await getDoc(categoryRef);

      if (!categorySnapshot.exists()) {
        toast.error("Category does not exist.");
        return;
      }

      const updatedCategory = { ...category, is_active: !category.is_active };
      await updateDoc(categoryRef, { is_active: updatedCategory.is_active });

      setCategories((prevCategories) =>
        prevCategories.map((cat) =>
          cat.docId === category.docId ? updatedCategory : cat
        )
      );

      toast.success(
        `Category ${
          updatedCategory.is_active ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      console.error("Error updating category status:", error);
      toast.error("Failed to update category status");
    }
  };

  const filteredCategories = categories?.filter((category) =>
    category.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-gray-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-800">
                {t.categories}
              </h1>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory({ name: "", is_active: true });
                    setIsAddingCategory(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                >
                  <Plus size={20} className="mr-2" />
                  {t.addCategory}
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
                >
                  <Download size={20} className="mr-2" />
                  {t.export}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 ">
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto overflow-y-scroll max-h-[85vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.image}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.name}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      {t.status}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCategories?.map((category, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {/* Image Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={category.imageUrl || placeholder} // Use a fallback if imageUrl is missing
                          alt={category.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                        {language === "en" ? category.name : category.arabic_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Switch
                          checked={category.is_active}
                          onChange={() => handleStatusToggle(category)}
                          className={`${
                            category.is_active ? "bg-green-600" : "bg-gray-200"
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                        >
                          <span className="sr-only">{t.toggleStatus}</span>
                          <span
                            className={`${
                              category.is_active
                                ? "translate-x-6"
                                : "translate-x-1"
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg`}
                          />
                        </Switch>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleCategoryClick(category)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
                        >
                          <Edit size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Modal */}
        {/* Modal */}
        {(selectedCategory || isAddingCategory) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {isAddingCategory ? "Add New Category" : "Edit Category"}
                </h2>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setIsAddingCategory(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                {selectedCategory && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveCategory(selectedCategory);
                    }}
                  >
                    <div className="space-y-4">
                      {/* Category Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.categoryName}
                        </label>
                        <input
                          type="text"
                          value={selectedCategory.name}
                          onChange={(e) =>
                            setSelectedCategory({
                              ...selectedCategory,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter category name"
                        />
                      </div>

                      {/* Arabic Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.arabicName}
                        </label>
                        <input
                          type="text"
                          value={selectedCategory.arabic_name || ""}
                          onChange={(e) =>
                            setSelectedCategory({
                              ...selectedCategory,
                              arabic_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter Arabic name"
                        />
                      </div>

                      {/* Image URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.imageUrl}
                        </label>
                        <input
                          type="text"
                          value={selectedCategory.imageUrl || ""}
                          readOnly
                          className="mt-1 p-2 border w-full rounded-md bg-gray-100"
                        />
                        <button
                          onClick={handleAddImage}
                          className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm mt-2"
                        >
                          Add Image
                        </button>
                        {selectedCategory?.imageUrl && (
        <img
          src={selectedCategory.imageUrl}
          alt="Category Preview"
          className="mt-3 w-32 h-32 object-cover rounded-md"
        />
      )}
                      </div>

                      {/* Active Status */}
                      <div className="flex items-center">
                        <label className="text-sm font-medium text-gray-700 mr-3">
                          {t.activeStatus}
                        </label>
                        <Switch
                          checked={selectedCategory?.is_active}
                          onChange={(checked) => {
                            setSelectedCategory((prev) => ({
                              ...prev,
                              is_active: checked,
                            }));
                          }}
                          className={`${
                            selectedCategory?.is_active
                              ? "bg-green-600"
                              : "bg-gray-200"
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                        >
                          <span className="sr-only">{t.toggleStatus}</span>
                          <span
                            className={`${
                              selectedCategory?.is_active
                                ? "translate-x-6"
                                : "translate-x-1"
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg`}
                          />
                        </Switch>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        {t.saveCategory}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
