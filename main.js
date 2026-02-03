// main.js (sửa để hỗ trợ soft-delete, id là chuỗi auto-increment, CRUD comments)

// URL base
const BASE = 'http://localhost:3000';

// Load posts và hiển thị; posts bị isDeleted sẽ gạch ngang
async function LoadData() {
    try {
        let res = await fetch(`${BASE}/posts`);
        let posts = await res.json();
        let body = document.getElementById("table-body");
        body.innerHTML = "";
        for (const post of posts) {
            const deleted = post.isDeleted === true;
            const titleHtml = deleted
                ? `<span style="text-decoration: line-through; color:gray">${post.title}</span>`
                : `${post.title}`;
            const viewsHtml = deleted
                ? `<span style="text-decoration: line-through; color:gray">${post.views}</span>`
                : `${post.views}`;

            body.innerHTML += `<tr>
                <td>${post.id}</td>
                <td>${titleHtml}</td>
                <td>${viewsHtml}</td>
                <td>
                  ${deleted ? `<input type='button' value='Restore' onclick='Restore(${JSON.stringify(post.id)})'/>` 
                            : `<input type='button' value='Delete' onclick='SoftDelete(${JSON.stringify(post.id)})'/>`}
                  <input type='button' value='Edit' onclick='EditPost(${JSON.stringify(post.id)})'/>
                </td>
            </tr>`;
        }
    } catch (error) {
        console.log(error);
    }
}

// Khi nhấn Edit: load post lên form để chỉnh sửa
async function EditPost(id) {
    try {
        let res = await fetch(`${BASE}/posts/${id}`);
        if (!res.ok) {
            alert('Không tìm thấy post');
            return;
        }
        const post = await res.json();
        document.getElementById("id_txt").value = post.id;
        document.getElementById("title_txt").value = post.title;
        document.getElementById("view_txt").value = post.views;
    } catch (err) {
        console.log(err);
    }
}

// Soft-delete: đặt isDeleted = true (PUT)
async function SoftDelete(id) {
    try {
        // lấy đối tượng hiện tại
        const getRes = await fetch(`${BASE}/posts/${id}`);
        if (!getRes.ok) {
            alert('Không tìm thấy post để xóa');
            return;
        }
        const post = await getRes.json();
        post.isDeleted = true;
        const res = await fetch(`${BASE}/posts/${id}`, {
            method: 'PUT',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(post)
        });
        if (res.ok) {
            console.log("xóa mềm thành công");
            LoadData();
        } else {
            console.log("xóa mềm thất bại", await res.text());
        }
    } catch (err) {
        console.log(err);
    }
}

// Restore (tuỳ chọn): đặt isDeleted = false
async function Restore(id) {
    try {
        const getRes = await fetch(`${BASE}/posts/${id}`);
        if (!getRes.ok) { alert('Không tìm thấy post'); return; }
        const post = await getRes.json();
        post.isDeleted = false;
        const res = await fetch(`${BASE}/posts/${id}`, {
            method: 'PUT',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(post)
        });
        if (res.ok) { LoadData(); }
    } catch (err) { console.log(err); }
}

// Save post: nếu id tồn tại -> PUT, nếu để trống -> POST với id = maxId+1 (lưu dưới dạng chuỗi)
async function Save() {
    try {
        let id = document.getElementById("id_txt").value.trim();
        let title = document.getElementById("title_txt").value;
        let views = Number(document.getElementById("view_txt").value || 0);

        if (id) {
            // update
            // lấy post hiện tại (nếu không tồn tại -> cảnh báo)
            const getRes = await fetch(`${BASE}/posts/${id}`);
            if (!getRes.ok) {
                alert('Không tìm thấy post để cập nhật');
                return;
            }
            const existing = await getRes.json();
            // bảo tồn các trường khác (vd isDeleted nếu có)
            const updated = {
                id: existing.id,
                title,
                views,
                isDeleted: existing.isDeleted === true
            };
            const res = await fetch(`${BASE}/posts/${id}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated)
            });
            if (res.ok) {
                console.log("Cập nhật post thành công");
            }
        } else {
            // tạo mới: lấy tất cả posts để tính max id
            const allRes = await fetch(`${BASE}/posts`);
            const all = await allRes.json();
            // chuyển id về số, bỏ các giá trị không hợp lệ
            const ids = all.map(p => {
                const n = Number(p.id);
                return Number.isFinite(n) ? n : 0;
            });
            const max = ids.length ? Math.max(...ids) : 0;
            const newId = String(max + 1); // lưu dưới dạng chuỗi
            const newPost = { id: newId, title, views, isDeleted: false };
            const res = await fetch(`${BASE}/posts`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPost)
            });
            if (res.ok) {
                console.log("Tạo post mới thành công");
            }
        }

        // clear form
        document.getElementById("id_txt").value = "";
        document.getElementById("title_txt").value = "";
        document.getElementById("view_txt").value = "";
        LoadData();
    } catch (err) {
        console.log(err);
    }
}

/* ---------------------------
   CRUD cho comments
   --------------------------- */

// Load comments
async function LoadComments() {
    try {
        const res = await fetch(`${BASE}/comments`);
        const comments = await res.json();
        const body = document.getElementById("comment-body");
        body.innerHTML = "";
        for (const c of comments) {
            body.innerHTML += `<tr>
                <td>${c.id}</td>
                <td>${c.postId}</td>
                <td>${escapeHtml(c.content)}</td>
                <td>
                  <input type='button' value='Edit' onclick='EditComment(${JSON.stringify(c.id)})'/>
                  <input type='button' value='Delete' onclick='DeleteComment(${JSON.stringify(c.id)})'/>
                </td>
            </tr>`;
        }
    } catch (err) {
        console.log(err);
    }
}

// Escape HTML đơn giản để hiển thị nội dung comment an toàn
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
}

// Edit comment: load dữ liệu lên form
async function EditComment(id) {
    try {
        const res = await fetch(`${BASE}/comments/${id}`);
        if (!res.ok) { alert('Không tìm thấy comment'); return; }
        const c = await res.json();
        document.getElementById("comment_id_txt").value = c.id;
        document.getElementById("comment_postid_txt").value = c.postId;
        document.getElementById("comment_content_txt").value = c.content;
    } catch (err) { console.log(err); }
}

// Save comment: nếu id tồn tại -> PUT, nếu không -> POST (auto id = max+1, lưu chuỗi)
async function SaveComment() {
    try {
        let id = document.getElementById("comment_id_txt").value.trim();
        let postId = document.getElementById("comment_postid_txt").value.trim();
        let content = document.getElementById("comment_content_txt").value;

        if (!postId) { alert('Vui lòng điền postId cho comment'); return; }

        if (id) {
            // update
            const getRes = await fetch(`${BASE}/comments/${id}`);
            if (!getRes.ok) { alert('Không tìm thấy comment để cập nhật'); return; }
            const existing = await getRes.json();
            const updated = { id: existing.id, postId: String(postId), content };
            const res = await fetch(`${BASE}/comments/${id}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated)
            });
            if (res.ok) { console.log('Cập nhật comment thành công'); }
        } else {
            // tạo mới: lấy tất cả comments để tính max id
            const allRes = await fetch(`${BASE}/comments`);
            const all = await allRes.json();
            const ids = all.map(p => { const n = Number(p.id); return Number.isFinite(n) ? n : 0; });
            const max = ids.length ? Math.max(...ids) : 0;
            const newId = String(max + 1);
            const newComment = { id: newId, postId: String(postId), content };
            const res = await fetch(`${BASE}/comments`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newComment)
            });
            if (res.ok) { console.log('Tạo comment thành công'); }
        }

        // clear form
        document.getElementById("comment_id_txt").value = "";
        document.getElementById("comment_postid_txt").value = "";
        document.getElementById("comment_content_txt").value = "";
        LoadComments();
    } catch (err) { console.log(err); }
}

// Xóa comment (hard delete bằng DELETE)
async function DeleteComment(id) {
    try {
        const res = await fetch(`${BASE}/comments/${id}`, { method: 'DELETE' });
        if (res.ok) { LoadComments(); }
    } catch (err) { console.log(err); }
}

// Khi load lần đầu
window.addEventListener('load', () => {
    LoadData();
    LoadComments();
});