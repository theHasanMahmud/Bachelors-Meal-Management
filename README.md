# 🍽️ Meal Management System

A comprehensive meal tracking and cost management system designed for households, hostels, and organizations. Features AI-powered smart input parsing, detailed cost breakdowns, and professional reporting capabilities.

![Meal Management System](https://img.shields.io/badge/React-18.0+-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18.0+-green?style=for-the-badge&logo=node.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38B2AC?style=for-the-badge&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

## ✨ Features

### 🤖 AI Smart Input Parser
- **Unformatted Input Support**: Accepts messy shopping lists like "vat 5kg 500 tk, murgi 1 kg 195 tk"
- **Automatic Categorization**: Intelligently categorizes items (Rice, Daal, Meat, Fish, Vegetables, Masala)
- **Bengali Translation**: Understands Bengali terms (lobon → Salt, chal → Rice, murgi → Chicken)
- **Smart Parsing**: Extracts quantity, unit, and price from various input formats

### 💰 Advanced Cost Management
- **Base Cost Tracking**: Individual item costs and quantities
- **Masala Cost Calculation**: Automatic masala cost allocation per meal type
- **Grand Total Calculation**: Combined base costs + masala costs
- **Real-time Updates**: Live cost calculations as you add items

### 👥 Member Management
- **Individual Profiles**: Track each member's meal consumption
- **Cost Breakdown**: Per-member cost analysis with masala costs
- **Meal History**: Detailed consumption patterns and dates
- **Export Capabilities**: Individual member PDF reports

### 📊 Professional Reporting
- **Complete Summary Report**: Comprehensive cost breakdown for all members
- **PDF Export**: Professional invoice-style reports
- **CSV Export**: Data analysis ready exports
- **Date Range Filtering**: Customizable reporting periods

### 🎨 Modern User Interface
- **Responsive Design**: Works perfectly on all devices
- **Professional Styling**: Clean, modern interface with Tailwind CSS
- **Interactive Elements**: Expandable sections, modals, and smooth animations
- **Color-coded Categories**: Visual distinction between different item types

## 🚀 Tech Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Vite**: Fast build tool and development server
- **Local Storage**: Client-side data persistence

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB Models**: Data structure definitions (ready for database integration)
- **RESTful API**: Clean API endpoints for data management

### Additional Technologies
- **PDF Generation**: Browser-based PDF export using HTML
- **AI Processing**: Regex-based smart text parsing
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Responsive Design**: Mobile-first approach with breakpoint optimization

## 📱 Screenshots
localhost_5173_ (2).png
image.png
image.png
*[Add screenshots of your application here]*

## 🎯 Use Cases

### 🏠 Households
- Track daily meal costs and grocery expenses
- Monitor food budget and spending patterns
- Plan meals based on cost analysis
- Generate expense reports for family budgeting

### 🏢 Hostels & Dormitories
- Manage multiple member meal consumption
- Track individual member costs
- Generate billing reports for residents
- Monitor food cost trends

### 🏢 Organizations
- Track cafeteria and food service costs
- Monitor employee meal expenses
- Generate cost reports for management
- Budget planning and analysis

### 🍴 Restaurants & Catering
- Track ingredient costs and meal pricing
- Monitor food cost margins
- Generate cost reports for menu planning
- Bulk meal cost calculations

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm 8.0 or higher
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/meal-management.git
   cd meal-management
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd client
   npm install
   
   # Install backend dependencies
   cd ../server
   npm install
   ```

3. **Start development servers**
   ```bash
   # Start frontend (in client directory)
   npm run dev
   
   # Start backend (in server directory)
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

### Production Build

```bash
# Build frontend for production
cd client
npm run build

# Start production server
cd ../server
npm start
```

## 📁 Project Structure

```
meal-management/
├── client/                     # React frontend application
│   ├── public/                # Static assets
│   ├── src/                   # Source code
│   │   ├── App.jsx           # Main application component
│   │   ├── index.css         # Global styles
│   │   └── main.jsx          # Application entry point
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
├── server/                    # Node.js backend application
│   ├── src/                  # Source code
│   │   ├── index.js          # Server entry point
│   │   ├── db.js             # Database configuration
│   │   ├── models/           # Data models
│   │   │   ├── MealEntry.js  # Meal entry model
│   │   │   ├── Member.js     # Member model
│   │   │   └── Purchase.js   # Purchase model
│   │   └── routes/           # API routes
│   │       ├── meals.js      # Meal management routes
│   │       ├── members.js    # Member management routes
│   │       └── purchases.js  # Purchase management routes
│   └── package.json          # Backend dependencies
├── README.md                  # Project documentation
└── .gitignore                # Git ignore file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

### Local Storage Keys

The application uses the following local storage keys:
- `meal_mgmt_purchases`: Purchase data
- `meal_mgmt_members`: Member data
- `meal_mgmt_meals`: Meal entry data
- `masalaChaiForm`: Form state persistence

## 📖 Usage Guide

### Adding Purchases

1. **Manual Entry**: Fill out the purchase form with item details
2. **AI Smart Input**: Use the AI parser for unformatted lists
3. **Auto-categorization**: Items are automatically categorized
4. **Unit Support**: Add units (KG, Gram, Liter, Piece, Pack)

### Managing Members

1. **Add Members**: Create new member profiles
2. **Track Meals**: Record daily meal consumption
3. **View History**: See individual member meal patterns
4. **Cost Analysis**: View per-member cost breakdowns

### Generating Reports

1. **Select Date Range**: Choose reporting period
2. **View Summary**: See cost breakdowns and totals
3. **Export PDF**: Download professional reports
4. **Export CSV**: Get data for external analysis

### AI Input Examples

The smart parser accepts various formats:

```
# Standard format
vat 5kg 500 tk
murgi 1 kg 195 tk
alu 2 kg 50 bdt

# Alternative formats
lobon 42 tk
chal 3 KG = 270 Tk
Salt Price 42
```

## 🎨 Customization

### Adding New Categories

To add new item categories, update the categorization logic in `App.jsx`:

```javascript
// Add new category keywords
if (itemNameLower.includes('new_category')) {
  mealType = 'newCategory'
}
```

### Modifying Masala Calculations

Adjust masala cost calculations in the `calculateTotalMasalaCost` function:

```javascript
case 'newCategory':
  // Add your calculation logic here
  break
```

### Styling Changes

The application uses Tailwind CSS. Modify classes in the JSX components to change appearance.

## 🧪 Testing

### Manual Testing

1. **Add Test Data**: Create sample purchases and members
2. **Test AI Parser**: Try various input formats
3. **Verify Calculations**: Check cost calculations accuracy
4. **Test Exports**: Verify PDF and CSV generation

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**: Ensure Node.js version is 18+
2. **Port Conflicts**: Change port in server configuration
3. **Local Storage Issues**: Clear browser cache and local storage
4. **PDF Export Issues**: Check browser popup blockers

### Debug Mode

Enable debug logging by setting:

```javascript
console.log('Debug information:', data)
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation for new features
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team**: For the amazing frontend framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Node.js Community**: For the robust backend runtime
- **Open Source Contributors**: For inspiration and tools

## 📞 Support

- **Email**: hasanmahmudmajumder@gmail.com

## 🔮 Roadmap

### Upcoming Features
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] User authentication and authorization
- [ ] Multi-tenant support
- [ ] Advanced analytics and charts
- [ ] Mobile app (React Native)
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests
- [ ] Docker containerization

### Version History

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added AI smart input parser
- **v1.2.0**: Enhanced cost breakdown and reporting
- **v1.3.0**: Added member profile management

---

**Built with ❤️ using React, Node.js, and modern web technologies**

**Star this repository if you find it helpful! ⭐**
