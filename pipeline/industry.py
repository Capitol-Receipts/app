"""Plain keyword rules that put a donor (employer + occupation) or a PAC into an industry.
Same rules for every member. Order matters: the first match wins."""
import re
R = lambda *w: re.compile(r'\b(' + '|'.join(w) + r')', re.I)
EMP = [
 ('Crypto', R('CRYPTO', 'COINBASE', 'BLOCKCHAIN', 'BITCOIN', 'RIPPLE', 'KRAKEN', 'CIRCLE INTERNET', 'ANDREESSEN')),
 ('Drug & medical companies', R('PHARMA', 'BIOTECH', 'THERAPEUTICS', 'PFIZER', 'MERCK', 'ABBVIE', 'AMGEN', 'ELI LILLY', 'LILLY', 'GILEAD', 'BRISTOL', 'JOHNSON & JOHNSON', 'REGENERON', 'MODERNA', 'NOVARTIS', 'GENENTECH', 'ASTRAZENECA', 'SANOFI', 'BIOGEN', 'VERTEX', 'MEDTRONIC', 'ABBOTT', 'STRYKER', 'BOSTON SCIENTIFIC', 'MEDICAL DEVICE')),
 ('Defense & aerospace', R('LOCKHEED', 'BOEING', 'RAYTHEON', 'RTX', 'NORTHROP', 'GENERAL DYNAMICS', 'L3HARRIS', 'HUNTINGTON INGALLS', 'ANDURIL', 'PALANTIR', 'LEIDOS', 'BOOZ ALLEN', 'SAIC', 'DEFENSE', 'AEROSPACE')),
 ('Tech', R('GOOGLE', 'ALPHABET', 'MICROSOFT', 'APPLE', 'AMAZON', 'META PLATFORMS', 'FACEBOOK', 'NVIDIA', 'ORACLE', 'SALESFORCE', 'IBM', 'INTEL', 'CISCO', 'ADOBE', 'NETFLIX', 'UBER', 'AIRBNB', 'OPENAI', 'ANTHROPIC', 'TESLA', 'SPACEX', 'TECHNOLOG', 'SOFTWARE', 'SEMICONDUCTOR', 'QUALCOMM', 'DELL', 'HEWLETT', 'LINKEDIN', 'X CORP', 'TWITTER', 'STRIPE')),
 ('Oil, gas & energy', R('OIL', 'GAS', 'PETROLEUM', 'EXXON', 'CHEVRON', 'CONOCO', 'SHELL', 'BP AMERICA', 'MARATHON', 'VALERO', 'PHILLIPS 66', 'PIPELINE', 'ENERGY', 'ELECTRIC', 'UTILIT', 'POWER', 'COAL', 'SOLAR', 'MIDSTREAM', 'DRILLING', 'RESOURCES')),
 ('Insurance', R('INSURANCE', 'STATE FARM', 'ALLSTATE', 'PROGRESSIVE', 'GEICO', 'METLIFE', 'PRUDENTIAL', 'AFLAC', 'MUTUAL OF', 'UNITEDHEALTH', 'HUMANA', 'CIGNA', 'ANTHEM', 'ELEVANCE', 'AETNA', 'BLUE CROSS', 'BLUECROSS')),
 ('Finance & investing', R('BANK', 'BANC', 'CAPITAL', 'INVEST', 'ASSET MANAGEMENT', 'FINANCIAL', 'SECURITIES', 'GOLDMAN', 'MORGAN STANLEY', 'JPMORGAN', 'JP MORGAN', 'CITIGROUP', 'CITI', 'WELLS FARGO', 'BLACKSTONE', 'BLACKROCK', 'KKR', 'CARLYLE', 'APOLLO', 'CITADEL', 'FIDELITY', 'VANGUARD', 'CHARLES SCHWAB', 'HEDGE', 'EQUITY', 'FUND', 'CREDIT', 'MORTGAGE', 'LENDING', 'TRADING', 'WEALTH')),
 ('Real estate', R('REAL ESTATE', 'REALTY', 'REALTOR', 'PROPERTIES', 'PROPERTY', 'KELLER WILLIAMS', 'COLDWELL', 'RE/MAX', 'REMAX', 'COMPASS', 'HOMES', 'DEVELOPMENT', 'APARTMENT', 'HOUSING')),
 ('Lawyers & law firms', R('LAW', 'LLP', 'ATTORNEY', 'LEGAL', 'LITIGATION', '& ASSOCIATES')),
 ('Hospitals & health care', R('HOSPITAL', 'HEALTH', 'MEDICAL', 'CLINIC', 'KAISER', 'MAYO', 'PHYSICIAN', 'DENTAL', 'ORTHOPED', 'SURGERY', 'SURGICAL', 'NURSING', 'CARDIO', 'ONCOLOGY', 'RADIOLOGY', 'PEDIATRIC', 'DERMATOLOGY', 'VETERINAR', 'PHARMACY', 'CVS', 'WALGREEN', 'HCA')),
 ('Construction', R('CONSTRUCTION', 'CONTRACTOR', 'CONTRACTING', 'BUILDERS', 'BUILDING', 'ROOFING', 'PLUMBING', 'CONCRETE', 'PAVING', 'EXCAVAT', 'ELECTRICAL')),
 ('Farming & food', R('FARM', 'RANCH', 'AGRI', 'CATTLE', 'DAIRY', 'GRAIN', 'TYSON', 'CARGILL', 'FOODS', 'POULTRY', 'SUGAR', 'ORCHARD', 'VINEYARD', 'WINERY', 'RESTAURANT', 'MCDONALD')),
 ('Transportation', R('AIRLINE', 'AIRWAYS', 'DELTA AIR', 'UNITED AIRLINES', 'AMERICAN AIRLINES', 'SOUTHWEST', 'FEDEX', 'UPS', 'TRUCKING', 'RAILROAD', 'RAILWAY', 'LOGISTICS', 'FREIGHT', 'SHIPPING', 'TRANSPORT', 'AUTOMOTIVE', 'MOTORS', 'FORD MOTOR', 'GENERAL MOTORS', 'TOYOTA', 'DEALERSHIP')),
 ('Telecom & media', R('VERIZON', 'AT&T', 'COMCAST', 'T-MOBILE', 'CHARTER', 'MEDIA', 'BROADCAST', 'TELEVISION', 'NEWS', 'PUBLISHING', 'DISNEY', 'WARNER', 'PARAMOUNT', 'FILM', 'STUDIOS', 'ENTERTAINMENT', 'MUSIC', 'TELECOM', 'WIRELESS', 'CABLE')),
 ('Education', R('UNIVERSITY', 'COLLEGE', 'SCHOOL', 'ACADEMY', 'EDUCATION', 'INSTITUTE OF TECHNOLOGY')),
 ('Government', R('STATE OF', 'CITY OF', 'COUNTY OF', 'COUNTY', 'U ?S ', 'UNITED STATES', 'DEPARTMENT OF', 'FEDERAL', 'GOVERNMENT', 'US HOUSE', 'US SENATE', 'CONGRESS', 'PUBLIC SCHOOLS', 'ARMY', 'NAVY', 'AIR FORCE', 'MARINE CORPS', 'POLICE', 'FIRE DEPARTMENT')),
 ('Unions', R('UNION', 'LOCAL \d', 'BROTHERHOOD', 'AFL-?CIO', 'TEAMSTERS', 'SEIU', 'AFSCME', 'UAW', 'IBEW', 'LABORERS')),
]
OCC = [
 ('Lawyers & law firms', R('ATTORNEY', 'LAWYER', 'COUNSEL', 'PARALEGAL', 'JUDGE')),
 ('Hospitals & health care', R('PHYSICIAN', 'DOCTOR', 'NURSE', 'SURGEON', 'DENTIST', 'M\.?D\.?$', 'PSYCHIATR', 'PSYCHOLOG', 'THERAPIST', 'PHARMACIST', 'CHIROPRACT', 'VETERINARIAN', 'OPTOMETRIST', 'ANESTHES', 'RADIOLOG', 'MEDICAL', 'HEALTH')),
 ('Finance & investing', R('INVESTOR', 'INVESTMENT', 'BANKER', 'FINANCE', 'FINANCIAL', 'PORTFOLIO', 'TRADER', 'HEDGE', 'PRIVATE EQUITY', 'VENTURE', 'ACCOUNTANT', 'CPA', 'ANALYST')),
 ('Real estate', R('REAL ESTATE', 'REALTOR', 'BROKER', 'DEVELOPER', 'PROPERTY', 'LANDLORD')),
 ('Tech', R('SOFTWARE', 'ENGINEER', 'PROGRAMMER', 'DEVELOPER', 'DATA SCIENTIST', 'PRODUCT MANAGER', 'IT ')),
 ('Education', R('TEACHER', 'PROFESSOR', 'EDUCATOR', 'PRINCIPAL', 'LIBRARIAN', 'RESEARCHER')),
 ('Farming & food', R('FARMER', 'RANCHER', 'GROWER', 'AGRICULTUR')),
 ('Construction', R('CONTRACTOR', 'BUILDER', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'CONSTRUCTION')),
 ('Oil, gas & energy', R('PETROLEUM', 'GEOLOGIST', 'OIL', 'ENERGY')),
 ('Insurance', R('INSURANCE', 'UNDERWRITER', 'ACTUARY')),
 ('Clergy & nonprofits', R('PASTOR', 'MINISTER', 'CLERGY', 'NONPROFIT', 'NON-PROFIT', 'PRIEST', 'RABBI')),
 ('Government', R('MILITARY', 'POLICE', 'FIREFIGHTER', 'PUBLIC SERVANT', 'CIVIL SERVANT', 'GOVERNMENT')),
]
RETIRED = re.compile(r'^\s*RETIRED\s*$', re.I)
NOTEMP = re.compile(r'^(NOT EMPLOYED|NONE|UNEMPLOYED|HOMEMAKER|STUDENT|N/?A|DISABLED)$', re.I)
def classify(employer, occupation):
    e = (employer or '').strip().upper(); o = (occupation or '').strip().upper()
    if RETIRED.match(e) or RETIRED.match(o): return 'Retired'
    if NOTEMP.match(e) and (not o or NOTEMP.match(o)): return 'Not employed'
    if e and not re.match(r'^(SELF|SELF[- ]EMPLOYED|INFORMATION REQUESTED.*|REQUESTED|N/?A|NONE)$', e):
        for name, rx in EMP:
            if rx.search(e): return name
    for name, rx in OCC:
        if rx.search(o): return name
    if o in ('CEO', 'OWNER', 'PRESIDENT', 'EXECUTIVE', 'BUSINESS OWNER', 'MANAGER', 'CONSULTANT', 'SALES', 'ENTREPRENEUR', 'BUSINESSMAN', 'BUSINESS'): return 'Other business'
    return 'Other or not listed'
def classify_pac(name, org_tp, cm_tp, dsgn):
    if dsgn == 'D': return 'Politicians’ PACs'
    if cm_tp in ('X', 'Y', 'Z'): return 'Party committees'
    if cm_tp in ('H', 'S', 'P'): return 'Politicians’ PACs'
    if org_tp == 'L': return 'Unions'
    for nm, rx in EMP:
        if rx.search(name or ''): return nm
    if org_tp in ('C', 'W', 'T', 'V'): return 'Other business'
    return 'Issue & ideological groups'
