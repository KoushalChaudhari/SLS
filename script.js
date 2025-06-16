document.addEventListener("DOMContentLoaded", () => {
  const addProductBtn = document.getElementById("addProduct");
  const saveBtn = document.querySelector(".actions button");
  const quotationTableBody = document.querySelector("table tbody");
  const customNoteTableBody = document.getElementById("customNoteTableBody");

  //Date
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const yyyy = today.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  document.getElementById("issueDate").valueAsDate = today;

  //search states
  /*const stateSelect = document.getElementById("state");
  if (stateSelect) {
    new Choices(stateSelect, {
      searchEnabled: true,
      itemSelectText: '',
      shouldSort: true
    });
  }*/

  function formatPrice(amount) {
    return parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

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

    // Optional: collect image
    const descInput = row.querySelector(".desc-input");
    const productId = descInput?.dataset.selectedId;
    if (productId) {
      const collectImage = async () => {
        try {
          const imageRes = await fetch(`/api/products/${productId}/image`);
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

  // Calculate totals for customisation note table
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

        target.dataset.selectedId = results.length === 1 ? results[0].id : "";

        // 🛠 Fetch product info
        const productInfo = await fetch(`/api/product-info?desc=${encodeURIComponent(description)}`);
        if (productInfo.ok) {
          const data = await productInfo.json();
          row.cells[3].querySelector("input").value = data.quantity || 1;
          row.cells[4].querySelector("input").value = data.price || 0;
        }

        // 🛠 Optionally fetch price from machine table as override
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
        const imageRes = await fetch(`/api/products/${productId}/image`);
        if (!imageRes.ok) throw new Error("Image not found");

        const blob = await imageRes.blob();
        const reader = new FileReader();

        reader.onload = () => {
          // ✅ Save base64 into dataset instead of trying to simulate file input
          input.dataset.imageBase64 = reader.result;
        };

        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn("Failed to load product image:", err);
      }
    }
  }
});

const logo = 'data:image/png;base64,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';

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
  //doc.text(`Quotation For: Inquiry for ${machineSummary()}`, 14, 71);
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
  const quotationId = document.getElementById("quotationId")?.value || `${dateStr}`;
  const amountDue = document.getElementById("amountDue")?.value || "";
  const currency = document.getElementById("currency")?.value || "";
  const fileName = `SLS_${quotationId || "unknown"}.pdf`;
  const clientPhone = document.getElementById("phone")?.value || "";
  const clientEmail = document.getElementById("email")?.value || "";
  const clientAddress = document.getElementById("street")?.value || "";
  const clientCity = document.getElementById("city")?.value || "";
  const clientPincode = document.getElementById("pincode")?.value || "";
  const clientState = document.getElementById("state")?.value || "";
  const clientGST = document.getElementById("gst")?.value || "";
  
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

  // Wait for all missing images to be fetched
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
    const imgWidth = 60;
    const spacingY = 20;
    const spacingX = 20;
    const marginLeft = 14;
    const marginTop = nextY;
    let col = 0;
    let rowY = marginTop;

    imageDataList.forEach((img, idx) => {
      // Calculate X position for 2 images per row
      const x = marginLeft + col * (imgWidth + spacingX);
      if (rowY + imgHeight + 10 > usablePageHeight) {
        doc.addPage();
        rowY = 20;
      }
      doc.addImage(img.base64, 'JPEG', x, rowY, imgWidth, imgHeight);

      // Caption below image, product name
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(img.name, x + imgWidth / 2, rowY + imgHeight + 7, { align: "center" });

      col++;
      if (col === 2) {
        col = 0;
        rowY += imgHeight + spacingY;
      }
    });

    // If odd number, move Y down for next section
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
      fillColor: [198, 187, 26],
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

  // Category > Machine > Price
  const categorySelect = document.getElementById("category");
  const machineSelect = document.getElementById("machine");
  const priceInput = document.getElementById("price");

  if (categorySelect && machineSelect && priceInput) {
    fetch('/api/categories')
      .then(res => res.json())
      .then(categories => {
        categories.forEach(cat => {
          const option = document.createElement("option");
          option.value = cat;
          option.textContent = cat;
          categorySelect.appendChild(option);
        });
      });

    categorySelect.addEventListener("change", () => {
      const category = categorySelect.value;
      machineSelect.innerHTML = '<option value="">Select machine</option>';
      machineSelect.disabled = true;

      if (category) {
        fetch(`/api/machines?category=${encodeURIComponent(category)}`)
          .then(res => res.json())
          .then(machines => {
            machines.forEach(machine => {
              const option = document.createElement("option");
              option.value = machine;
              option.textContent = machine;
              machineSelect.appendChild(option);
            });
            machineSelect.disabled = false;
          });
      }
    });

    machineSelect.addEventListener("change", () => {
      const selectedMachine = machineSelect.value;
      fetch(`/api/price?machine=${encodeURIComponent(selectedMachine)}`)
        .then(res => res.json())
        .then(data => {
          priceInput.value = data.price || "0.00";
        });
    });
  }

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