import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  settings = {
    notifications: true,
    darkMode: false,
    language: 'en'
  };

  saveSettings() {
    console.log('Settings saved:', this.settings);
    alert('Settings updated successfully!');
    // 🔗 later: send this.settings to API
  }
}
