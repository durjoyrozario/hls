document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const roll = document.getElementById('roll').value;
      const reg = document.getElementById('reg').value;
      const res = await fetch('login.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({roll, reg})
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('auth', 'true');
        window.location.href = 'dashboard.html';
      } else {
        document.getElementById('error').innerText = 'ভুল রোল বা রেজিস্ট্রেশন নম্বর';
      }
    });
  }

  if (window.location.pathname.includes('dashboard.html')) {
    if (sessionStorage.getItem('auth') !== 'true') {
      alert('প্রথমে লগইন করুন');
      window.location.href = 'index.html';
      return;
    }
    fetch('get_books.php')
      .then(res => res.json())
      .then(data => {
        const tbody = document.getElementById('bookBody');
        data.forEach(book => {
          const row = `<tr>
            <td contenteditable="false">${book.serial}</td>
            <td contenteditable="false">${book.book_name}</td>
            <td contenteditable="false">${book.issue_date}</td>
            <td contenteditable="false">${book.return_date}</td>
          </tr>`;
          tbody.innerHTML += row;
        });
      });
  }
});

function enableEdit() {
  document.querySelectorAll('#bookTable td').forEach(cell => {
    cell.contentEditable = true;
  });
}

function saveTable() {
  const rows = document.querySelectorAll('#bookTable tbody tr');
  const books = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    books.push({
      serial: cells[0].innerText.trim(),
      book_name: cells[1].innerText.trim(),
      issue_date: cells[2].innerText.trim(),
      return_date: cells[3].innerText.trim()
    });
  });

  fetch('save_books.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(books)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) alert('সংরক্ষণ সফল হয়েছে');
    else alert('সংরক্ষণ ব্যর্থ হয়েছে');
  });
}