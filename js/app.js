document.addEventListener('DOMContentLoaded', async () => {
  await loadTutorsUI();
});

async function loadTutorsUI() {
  const tutorContainer = document.getElementById('tutor-container');
  if (!tutorContainer) return;

  const tutors = await getTutors();
  tutorContainer.innerHTML = '';

  tutors.forEach(tutor => {
    const isOfflineEligible = (tutor.total_reviews >= 10 && tutor.rating >= 4.0) && tutor.is_offline_verified;
    const badgeOffline = isOfflineEligible 
      ? `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Offline & Online</span>`
      : `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Online Only</span>`;

    tutorContainer.innerHTML += `
      <div class="border rounded-lg p-4 shadow-sm bg-white">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-lg">${tutor.name}</h3>
          ${badgeOffline}
        </div>
        <p class="text-sm text-gray-600">${tutor.subject} (${tutor.level})</p>
        <p class="text-sm font-semibold mt-2">Rp ${tutor.price.toLocaleString('id-ID')} / jam</p>
      </div>
    `;
  });
}