document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const message = document.getElementById('message');
  const preview = document.getElementById('preview');
  const productImage = document.getElementById('productImage');
  const productIdInput = document.getElementById('product_id');
  const productInfo = document.getElementById('productInfo');

  async function fetchImage(productId) {
    if (!productId) return productImage.style.display = 'none';
    try {
      const res = await fetch('/image/' + productId);
      if (!res.ok) return productImage.style.display = 'none';
      const blob = await res.blob();
      productImage.src = URL.createObjectURL(blob);
      productImage.style.display = 'block';
    } catch {
      productImage.style.display = 'none';
    }
  }

async function fetchProductInfo(productId) {
  if (!productId) {
    productInfo.style.display = 'none';
    productInfo.innerHTML = '';
    return;
  }

  try {
    const res = await fetch('/product/' + productId);
    if (!res.ok) {
      productInfo.style.display = 'none';
      productInfo.innerHTML = '';
      return;
    }
    const data = await res.json();
    productInfo.innerHTML = `
      <div><strong>Name:</strong> ${data.name || ''}</div>
      <div><strong>Description:</strong> ${data.description || ''}</div>
      <div><strong>Category:</strong> ${data.category || ''}</div>
      <div><strong>Price:</strong> ${data.price != null ? data.price : ''}</div>
      <div><strong>Image:</strong><br><img src="/image/${productId}" alt="Product Image" style="max-width: 100%; max-height: 200px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px;" onerror="this.style.display='none';" /></div>
    `;
    productInfo.style.display = 'block';
  } catch {
    productInfo.style.display = 'none';
    productInfo.innerHTML = '';
  }
}

function loadProductTable() {
  fetch('/api/products/all')
    .then(res => res.json())
    .then(products => {
      const headerRow = document.getElementById('headerRow');
      const body = document.getElementById('productsBody');
      headerRow.innerHTML = '';
      body.innerHTML = '';

      if (!products || products.length === 0) return;
      const keys = Object.keys(products[0]);
      keys.push('Image');

      keys.forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
      });

      products.forEach(prod => {
        const tr = document.createElement('tr');
        keys.forEach(key => {
          const td = document.createElement('td');
          if (key === 'Image') {
            const id = prod.product_id;
            if (id !== undefined) {
              const a = document.createElement('a');
              a.href = '/image/' + id;
              a.textContent = 'View Image';
              a.target = '_blank';
              td.appendChild(a);
            } else {
              td.textContent = '—';
            }
          } else {
            td.textContent = prod[key] ?? '';
          }
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    });
}

loadProductTable();

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const productMessage = document.getElementById('productMessage');
  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch('/product', {
      method: 'POST',
      body: formData
    });
    const text = await res.text();
    productMessage.textContent = text;
    productMessage.className = res.ok ? 'message' : 'message error';

    // Reload product table
    loadProductTable();
    form.reset();
  } catch (err) {
    productMessage.textContent = 'Failed to add product.';
    productMessage.className = 'message error';
  }
});


productIdInput.addEventListener('input', () => {
  const id = parseInt(productIdInput.value);
  if (isNaN(id)) return;

  fetchImage(id);
  fetchProductInfo(id);
});


  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';
    message.className = 'message';
    const formData = new FormData(uploadForm);
    try {
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      const text = await res.text();
      message.textContent = text;
      if (res.ok) fetchImage(productIdInput.value);
      else message.className = 'message error';
    } catch {
      message.textContent = 'Upload failed.';
      message.className = 'message error';
    }
  });

  if (productIdInput.value) {
    fetchImage(productIdInput.value);
    fetchProductInfo(productIdInput.value);
  }

  // Theme toggle
  const themeBtn = document.getElementById('themeToggleBtn');
  const body = document.body;

  if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    themeBtn.textContent = '☀️ Light Mode';
  }

  themeBtn.addEventListener('click', function() {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
});
