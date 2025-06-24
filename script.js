document.addEventListener("DOMContentLoaded", () => {
  const addProductBtn = document.getElementById("addProduct");
  const saveBtn = document.querySelector(".actions button");
  const quotationTableBody = document.querySelector("table tbody");
  const customNoteTableBody = document.getElementById("customNoteTableBody");

  //Date
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); 
  const yyyy = today.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  document.getElementById("issueDate").valueAsDate = today;

  function formatPrice(amount) {
    return parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      const res = await fetch("/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login.html";
      } else {
        alert("Logout failed.");
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Logout error occurred.");
    }
  });


  // Product table

  function updateRowNumbers() {
    quotationTableBody.querySelectorAll("tr").forEach((row, index) => {
      row.cells[0].textContent = index + 1;
    });
  }

  quotationTableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-row")) {
      const row = e.target.closest("tr");
      row.remove();
      updateRowNumbers();
      recalculateTotals();
    }
  });

  addProductBtn?.addEventListener("click", () => {
    const row = document.createElement("tr");
    const rowIndex = quotationTableBody.rows.length + 1;
    row.innerHTML = `
      <td>${rowIndex}</td>
      <td><input type="file" accept="image/*" /></td>
      <td><input type="text" class="desc-input" list="product-suggestions" placeholder="Search product" /><datalist id="product-suggestions"></datalist></td>
      <td><input type="number" value="1" style="width: 50px;" /></td>
      <td><input type="number" value="0.00" /></td>
      <td><input type="number" value="18" style="width: 50px;" /></td>
      <td><input type="number" value="0" style="width: 50px;" /></td>
      <td style="min-width: 80px;">0.00</td>
      <td><button class="delete-row">Delete</button></td>
    `;
    quotationTableBody.appendChild(row);
  });

  // Note table

  if (customNoteTableBody) {
    customNoteTableBody.addEventListener("input", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        recalculateTotals();
      }
    });
  }

  function updateCustomRowNumbers() {
    const rows = customNoteTableBody.querySelectorAll("tr");
    rows.forEach((row, index) => {
      row.cells[0].textContent = index + 1;
    });
  }

  customNoteTableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-custom-row")) {
      const row = e.target.closest("tr");
      row.remove();
      updateCustomRowNumbers();
      recalculateTotals();
    }
  });

  document.getElementById("addNoteBtn")?.addEventListener("click", () => {
  const tbody = document.getElementById("customNoteTableBody");
  const rowCount = tbody.rows.length + 1;
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${rowCount}</td>
    <td><textarea placeholder="Enter Note here..." class="custom-textarea" style="max-width: max-content; min-height: min-content;"></textarea></td>
    <td><input type="number" value="1" /></td>
    <td><input type="number" value="0.00" /></td>
    <td><input type="number" value="18" style="width: 50px;" /></td>
    <td style="text-align: center; min-width: 80px;">0.00</td>
    <td><button class="delete-custom-row">Delete</button></td>
  `;
  tbody.appendChild(row);
});

function recalculateTotals() {
  let grandTotal = 0;
  const imagePromises = [];
  const imageDataList = [];

  // Calculate product table rows
  quotationTableBody.querySelectorAll("tr").forEach((row, i) => {
    const qty = parseFloat(row.cells[3]?.querySelector("input")?.value || 0);
    const price = parseFloat(row.cells[4]?.querySelector("input")?.value || 0);
    const gst = parseFloat(row.cells[5]?.querySelector("input")?.value || 0);
    const discount = parseFloat(row.cells[6]?.querySelector("input")?.value || 0);

    const subtotal = qty * price;
    const total = subtotal + (subtotal * gst / 100) - (subtotal * discount / 100);
    grandTotal += total;

    // Update total column
    row.cells[7].textContent = total.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // collect image
    const descInput = row.querySelector(".desc-input");
    const productId = descInput?.dataset.selectedId;
    if (productId) {
      const collectImage = async () => {
        try {
          const imageRes = await fetch(`/image/${productId}`);
          if (!imageRes.ok) throw new Error("Image not found");
          const blob = await imageRes.blob();
          const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          imageDataList.push({ base64, rowIndex: i });
        } catch (err) {
          console.warn("Image fetch failed for row", i + 1, err);
        }
      };
      imagePromises.push(collectImage());
    }
  });

  // Calculate custom table cost
  const customTbody = document.getElementById("customNoteTableBody");
  if (customTbody) {
    customTbody.querySelectorAll("tr").forEach((row) => {
      const qty = parseFloat(row.cells[2]?.querySelector("input")?.value || 0);
      const price = parseFloat(row.cells[3]?.querySelector("input")?.value || 0);
      const gst = parseFloat(row.cells[4]?.querySelector("input")?.value || 0);

      const subtotal = qty * price;
      const total = subtotal + (subtotal * gst / 100);
      grandTotal += total;

      // Update total column in customisation table
      row.cells[5].textContent = total.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });
  }

  // Update final amount due
  const amountDueEl = document.getElementById("amountDue");
  if (amountDueEl.tagName === "INPUT") {
    amountDueEl.value = grandTotal.toFixed(2);
  } else {
    amountDueEl.textContent = grandTotal.toFixed(2);
  }
}

quotationTableBody?.addEventListener("input", async (e) => {
  const target = e.target;
  const row = target.closest("tr");

  if (target.classList.contains("desc-input")) {
    const description = target.value.trim();

    if (description.length >= 2) {
      try {
        // 🔍 Fetch search suggestions
        const searchRes = await fetch(`/api/products/search?q=${encodeURIComponent(description)}`);
        if (!searchRes.ok) throw new Error("Search failed");
        const results = await searchRes.json();

        const datalist = document.getElementById("product-suggestions");
        datalist.innerHTML = "";

        results.forEach(({ id, name }) => {
          const option = document.createElement("option");
          option.value = name;
          option.dataset.id = id;
          datalist.appendChild(option);
        });

        if (results.length === 1) {
          const selectedId = results[0].id;
          target.dataset.selectedId = selectedId;

          //fetch and store base64 image
          try {
            const imageRes = await fetch(`/image/${selectedId}`);
            if (imageRes.ok) {
              const blob = await imageRes.blob();
              const base64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              target.dataset.imageBase64 = base64;
            }
          } catch (err) {
            console.warn("Image fetch error during input:", err);
          }
        } else {
          target.dataset.selectedId = "";
          target.dataset.imageBase64 = "";
        }


        //Fetch product info
        const productInfo = await fetch(`/api/product-info?desc=${encodeURIComponent(description)}`);
        if (productInfo.ok) {
          const data = await productInfo.json();
          row.cells[3].querySelector("input").value = data.quantity || 1;
          row.cells[4].querySelector("input").value = data.price || 0;
        }

        //fetch price from machine table
        const machineName = description;
        const machineRes = await fetch(`/api/price?machine=${encodeURIComponent(machineName)}`);
        if (machineRes.ok) {
          const { price: machinePrice } = await machineRes.json();
          row.cells[4].querySelector("input").value = parseFloat(machinePrice).toFixed(2);
        }

      } catch (err) {
        console.warn("Error during product lookup:", err);
      }
    }
  }

  recalculateTotals();
});

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

quotationTableBody?.addEventListener("change", async (e) => {
  if (e.target.matches(".desc-input")) {
    const input = e.target;
    const productId = input.dataset.selectedId;
    const row = input.closest("tr");

    if (productId) {
      try {
        const imageRes = await fetch(`/image/${productId}`);
        if (!imageRes.ok) throw new Error("Image not found");

        const blob = await imageRes.blob();
        const reader = new FileReader();

        reader.onload = () => {
          // Save base64 into dataset 
          input.dataset.imageBase64 = reader.result;
        };

        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn("Failed to load product image:", err);
      }
    }
  }
});

const logo = '';
function machineSummary() {
  return Array.from(quotationTableBody.querySelectorAll("tr"))
    .map(row => row.cells[2]?.querySelector("input")?.value || "")
    .filter(text => text.trim() !== "")
    .join(", ");
}

function generateHeaderSection(doc, clientName, companyName, quotationId, issueDate, amountDue, clientDetails) {
  // logo
  doc.addImage(logo, 'PNG', 35, 9, 140, 20);

  // Company name and contact 
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Shree Laser Systems", 120, 40);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gala No 3, Sterling Industrial Estate,", 120, 46);
  doc.text("Navghar Road, Vasai (E), Maharashtra 401210", 120, 51);
  doc.text("+91 9594686749", 120, 57);
  doc.text("shreelasers@gmail.com", 120, 61);
  doc.setTextColor(0, 102, 204);
  doc.textWithLink("https://shreelasersystems.net", 120, 71, {
    url: "https://www.shreelasersystems.net/"
  });
  doc.setTextColor(0, 0, 0);
  doc.text("GSTIN : 27AGSPC6614J1Z4", 120, 66);

  // Client Info 
  doc.setFont("helvetica", "bold");
  doc.text("Quote To,", 14, 40);
  doc.setFont("helvetica", "normal");
  doc.text(clientName, 14, 45);
  doc.text(companyName, 14, 50);

  let y = 60;
  clientDetails.forEach(line => {
    doc.text(line, 14, y);
    y += 5;
  });


  doc.text("Quotation ID: " + quotationId, 14, 90);

  // Date & Amount Due side-by-side
  doc.setFont("helvetica", "bold");
  doc.text("Date of Issue", 120, 90);
  doc.text("Amount Due (INR)", 160, 90);

  doc.setFont("helvetica", "normal");
  doc.text(issueDate, 120, 95);
  doc.text("Rs. " + Number(amountDue).toLocaleString('en-IN'), 160, 95);

  // Title line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Dear ${clientName},`, 14, 95);
}

// PDF Generation

saveBtn?.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const fullName = document.getElementById("fullName")?.value || "";
  const companyName = document.getElementById("companyName")?.value || "";
  const issueDate = document.getElementById("issueDate")?.value || "";
  const amountDue = document.getElementById("amountDue")?.value || "";
  const clientPhone = document.getElementById("phone")?.value || "";
  const clientEmail = document.getElementById("email")?.value || "";
  const clientAddress = document.getElementById("street")?.value || "";
  const clientCity = document.getElementById("city")?.value || "";
  const clientPincode = document.getElementById("pincode")?.value || "";
  const clientState = document.getElementById("state")?.value || "";
  const clientGST = document.getElementById("gst")?.value || "";

  // save quotation and get quotationId
  const saveData = {
    clientName: fullName,
    companyName: companyName
  };
  const res = await fetch('/api/quotations', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(saveData)
  });

  const result = await res.json();
  const quotationId = result.quotationId;

  const fileName = `${quotationId}.pdf`;

  // Client details for PDF
  const clientDetails = [
    clientAddress,
    `${clientCity}, ${clientState} - ${clientPincode}`,
    `Phone: ${clientPhone}`,
    `Email: ${clientEmail}`,
    `GSTIN: ${clientGST}`
  ];


  const customTableBody = [];
  document.querySelectorAll("#customNoteTableBody tr").forEach((row, i) => {
    const no = row.cells[0].textContent;
    const desc = row.cells[1].querySelector("textarea")?.value || "";
    const qty = row.cells[2].querySelector("input")?.value || "1";
    const price = row.cells[3].querySelector("input")?.value || "0.00";
    const gst = row.cells[4].querySelector("input")?.value || "18";
    const total = row.cells[5]?.textContent || "0.00";

    customTableBody.push([no, desc, qty, price, gst, total]);
  });

  const salespersonId = sessionStorage.getItem('salespersonId'); 
  if (!quotationId) {
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: fullName,
          companyName: companyName,
          salespersonId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to save quotation: ${data.error}`);
        return;
      }

      const data = await res.json();
      quotationId = data.quotationId;
    } catch (err) {
      alert('Error saving quotation to database.');
      return;
    }
  }


  generateHeaderSection(doc, fullName, companyName, quotationId, issueDate, amountDue, clientDetails);
  const usablePageHeight = doc.internal.pageSize.height - 20;

  const tableBody = [];
  const imageDataList = [];

  // Fetch Images
  const fetchImagePromises = [];
  quotationTableBody.querySelectorAll("tr").forEach((row, i) => {
    const no = row.cells[0]?.textContent || "";
    const desc = row.cells[2]?.querySelector("input")?.value || "";
    const qty = row.cells[3]?.querySelector("input")?.value || "";
    const price = row.cells[4]?.querySelector("input")?.value || "";
    const gst = row.cells[5]?.querySelector("input")?.value || "";
    const discount = row.cells[6]?.querySelector("input")?.value || "";
    const total = row.cells[7]?.textContent || "";

    tableBody.push([no, desc, qty, price, gst, discount, total]);

    const descInput = row.querySelector(".desc-input");
    const productId = descInput?.dataset.selectedId;

    // Fetch if base64 is missing
    if (descInput && productId && !descInput.dataset.imageBase64) {
      fetchImagePromises.push(
        fetch(`/api/products/${productId}/image`)
          .then(res => res.ok ? res.blob() : null)
          .then(blob => blob ? new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => {
              descInput.dataset.imageBase64 = reader.result;
              imageDataList.push({ base64: reader.result, rowIndex: i, name: desc });
              resolve();
            };
            reader.readAsDataURL(blob);
          }) : null)
          .catch(() => null)
      );
    } else if (descInput?.dataset.imageBase64) {
      imageDataList.push({ base64: descInput.dataset.imageBase64, rowIndex: i, name: desc });
    }
  });

  if (fetchImagePromises.length > 0) {
    await Promise.all(fetchImagePromises);
  }

  doc.autoTable({
    startY: 105,
    head: [['No.', 'Description', 'Qty', 'Price', 'GST %', 'Discount %', 'Total']],
    body: tableBody,
    styles: {
      fontSize: 10,
      cellPadding: 2,
      valign: 'middle',
      halign: 'center',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [0, 153, 76],
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
      cellPadding: 2,
      valign: 'middle',
      halign: 'center'
    },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' }
    },

    bodyStyles: {
      fillColor: [245, 245, 245]  
    },

    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  });

  let nextY = doc.lastAutoTable.finalY + 10;

  // === PRODUCT IMAGES ===
  if (imageDataList.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCT IMAGES", 14, nextY);
    nextY += 6;

    const imgHeight = 60;
    const imgWidth = 80;
    const spacingY = 20;
    const spacingX = 20;
    const marginLeft = 14;
    const marginTop = nextY;
    let col = 0;
    let rowY = marginTop;

    imageDataList.forEach((img, idx) => {
      const x = marginLeft + col * (imgWidth + spacingX);
      if (rowY + imgHeight + 10 > usablePageHeight) {
        doc.addPage();
        rowY = 20;
      }
      doc.addImage(img.base64, 'JPEG', x, rowY, imgWidth, imgHeight);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(img.name, x + imgWidth / 2, rowY + imgHeight + 7, { align: "center" });

      col++;
      if (col === 2) {
        col = 0;
        rowY += imgHeight + spacingY;
      }
    });

    if (col === 1) {
      nextY = rowY + imgHeight + spacingY;
    } else {
      nextY = rowY;
    }
  }

  nextY += 10;
  // === CUSTOMISATION DETAILS ===

  if (customTableBody.length > 0) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CUSTOMISATION DETAILS", 14, nextY);
  nextY += 6;

  doc.autoTable({
    startY: nextY,
    head: [['No.', 'Description', 'Qty', 'Price', 'GST (%)', 'Total']],
    body: customTableBody,
    styles: {
      fontSize: 10,
      cellPadding: 2,
      valign: 'middle',
      halign: 'center',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [0, 153, 76],
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
      cellPadding: 2,
      valign: 'middle',
      halign: 'center'
    },
    columnStyles: {
      2: { halign: 'left' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' }
    },

    bodyStyles: {
      fillColor: [245, 245, 245]  
    },

    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  });

  nextY = doc.lastAutoTable.finalY + 10;
}

  // === NEW PAGE ===
  doc.addPage();
  nextY = 20;

  // === TERMS AND CONDITIONS ===
  doc.setFont("Arial", "bold");
  doc.setFontSize(16);
  doc.text("TERMS AND CONDITIONS OF SUPPLY:", 14, nextY);
  doc.setLineWidth(0.5);
  doc.line(14, nextY + 1, 200, nextY + 1);
  nextY += 6;

  doc.setFontSize(12);
  doc.setFont("Arial", "normal");

  document.querySelectorAll(".tc-row").forEach(row => {
    const label = row.querySelector(".tc-label")?.textContent.trim() || "";
    const desc = row.querySelector(".tc-description")?.textContent.trim() || "";
    const lines = doc.splitTextToSize(`- ${label}: ${desc}`, 170);
    const lineHeight = 6 * lines.length;

    if (nextY + lineHeight > usablePageHeight) {
      doc.addPage();
      nextY = 20;
    }

    doc.text(lines, 14, nextY);
    nextY += lineHeight;
  });

  nextY += 10;

  // === WARRANTY CLAUSES ===
  doc.setFont("Arial", "bold");
  doc.setFontSize(16);
  doc.text("WARRANTY CLAUSES:", 14, nextY);
  doc.setLineWidth(0.5);
  doc.line(14, nextY + 1, 200, nextY + 1);
  nextY += 6;

  doc.setFont("Arial", "normal");
  doc.setFontSize(12);

  document.querySelectorAll(".warranty-list li").forEach(li => {
    const text = li.textContent.trim();
    const lines = doc.splitTextToSize(`- ${text}`, 170);
    const lineHeight = 6 * lines.length;

    if (nextY + lineHeight > usablePageHeight) {
      doc.addPage();
      nextY = 20;
    }

    doc.text(lines, 14, nextY);
    nextY += lineHeight;
  });

  nextY += 10;
  // === BANK DETAILS ===
  doc.setFont("Arial", "bold");
  doc.setFontSize(16);
  doc.text("BANK DETAILS:", 14, nextY);
  doc.setLineWidth(0.5);
  doc.line(14, nextY + 1, 200, nextY + 1);
  nextY += 6;

  doc.setFontSize(12);
  doc.setFont("Arial", "normal");

  document.querySelectorAll(".bank-row").forEach(row => {
    const label = row.querySelector(".bank-label")?.textContent.trim() || "";
    const desc = row.querySelector(".bank-description")?.textContent.trim() || "";
    const lines = doc.splitTextToSize(`- ${label}: ${desc}`, 170);
    const lineHeight = 6 * lines.length;

    if (nextY + lineHeight > usablePageHeight) {
      doc.addPage();
      nextY = 20;
    }

    doc.text(lines, 14, nextY);
    nextY += lineHeight;
  });

  nextY += 45;
  // === THANK YOU ===
  doc.setFont("Arial", "bold");
  doc.setFontSize(16);
  doc.text("THANK YOU FOR YOUR ENQUIRY!", 55, nextY);
  nextY += 10;

  // === Page numbers ===
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 180, 290);
  }

  doc.save(fileName);
});

// Theme

  const theme = document.getElementById("theme");

  function updateTheme(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
      theme.textContent = "☀️ Light Mode";
    } else {
      document.body.classList.remove("dark-mode");
      theme.textContent = "🌙 Dark Mode";
    }
  }


  const darkModeSaved = localStorage.getItem("darkMode") === "enabled";
  updateTheme(darkModeSaved);

  theme.addEventListener("click", () => {
    const isEnabled = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isEnabled ? "disabled" : "enabled");
    updateTheme(!isEnabled);
  });

});
